import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const headerToken = req.header('x-admin-token');
  const bearer = (req.header('authorization') || '').split(' ');
  const token = headerToken || (bearer[0] === 'Bearer' ? bearer[1] : undefined);

  if (!token) {
    console.error('[deploy-webhook] Admin authentication failed - No token provided:', {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      clientIp: req.ip || req.socket.remoteAddress,
      hasHeaderToken: !!headerToken,
      hasAuthorizationHeader: !!req.header('authorization'),
      authorizationFormat: bearer[0] || 'none',
    });
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && typeof decoded === 'object') {
      (req as any).user = decoded;
      next();
      return;
    }
  } catch (error) {
    console.error('[deploy-webhook] Admin authentication failed - JWT verification failed:', {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      clientIp: req.ip || req.socket.remoteAddress,
      tokenLength: token?.length || 0,
      hasAdminToken: !!ADMIN_TOKEN,
      adminTokenLength: ADMIN_TOKEN?.length || 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  res.status(401).json({ success: false, error: 'Unauthorized' });
}
