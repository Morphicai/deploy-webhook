import { Request, Response, NextFunction } from 'express';
import { verifyAPIKey, recordAPIKeyUsage, type APIKeyPermission } from '../services/apiKeyStore';

// Extend Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: number;
        permission: APIKeyPermission;
      };
    }
  }
}

/**
 * Extract API Key from request headers or query parameters
 */
function extractAPIKey(req: Request): string | null {
  // Priority 1: Check X-API-Key header
  const xApiKey = req.header('x-api-key');
  if (xApiKey) {
    return xApiKey;
  }

  // Priority 2: Check Authorization header (Bearer token)
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Only treat as API key if it starts with 'dw_'
    if (token.startsWith('dw_')) {
      return token;
    }
  }

  // Priority 3: Check query parameter (for SSE connections)
  const queryApiKey = req.query.apiKey || req.query.api_key || req.query['X-API-Key'];
  if (queryApiKey && typeof queryApiKey === 'string') {
    return queryApiKey;
  }

  return null;
}

/**
 * Middleware to require API Key authentication
 */
export function requireAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = extractAPIKey(req);

  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      message: 'Please provide an API key via X-API-Key header or Authorization Bearer token',
    });
    return;
  }

  try {
    const keyRecord = verifyAPIKey(apiKey);

    if (!keyRecord) {
      console.error('[api-key-auth] Invalid or expired API key');
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has expired',
      });
      return;
    }

    // Record usage
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    recordAPIKeyUsage(keyRecord.id, clientIp);

    // Attach API key info to request
    req.apiKey = {
      id: keyRecord.id,
      permission: keyRecord.permission,
    };

    next();
  } catch (error) {
    console.error('[api-key-auth] Error verifying API key:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to verify API key',
    });
  }
}

/**
 * Middleware to require specific permission level
 */
export function requirePermission(
  ...requiredPermissions: APIKeyPermission[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication required',
      });
      return;
    }

    const hasPermission = requiredPermissions.includes(req.apiKey.permission);

    if (!hasPermission) {
      console.error('[api-key-auth] Insufficient permissions:', {
        required: requiredPermissions,
        actual: req.apiKey.permission,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `This operation requires one of the following permissions: ${requiredPermissions.join(', ')}`,
        yourPermission: req.apiKey.permission,
      });
      return;
    }

    next();
  };
}

/**
 * Combined middleware: Allow Admin Token, JWT, or API Key
 */
export function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
  const headerToken = req.header('x-admin-token');
  const authHeader = req.header('authorization') || '';
  const bearer = authHeader.split(' ');

  // Check for admin token first
  if (headerToken && ADMIN_TOKEN && headerToken === ADMIN_TOKEN) {
    next();
    return;
  }

  // Check for JWT
  if (bearer[0] === 'Bearer' && bearer[1] && !bearer[1].startsWith('dw_')) {
    // Let admin auth handle JWT verification
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
    
    try {
      const decoded = jwt.verify(bearer[1], JWT_SECRET);
      if (decoded && typeof decoded === 'object') {
        (req as any).user = decoded;
        next();
        return;
      }
    } catch (error) {
      // JWT verification failed, try API key
    }
  }

  // Try API key authentication
  requireAPIKey(req, res, next);
}

