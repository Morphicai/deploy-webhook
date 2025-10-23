import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { deployConfig } from '../config';
import { DeployRequest } from '../types';
import { isImageWhitelisted } from '../services/imageWhitelistStore';
import { verifyAPIKey } from '../services/apiKeyStore';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

/**
 * 验证用户是否已登录（JWT token 或 admin token）
 */
export function validateUserAuth(req: Request): boolean {
  const headerToken = req.header('x-admin-token');
  const bearer = (req.header('authorization') || '').split(' ');
  const token = headerToken || (bearer[0] === 'Bearer' ? bearer[1] : undefined);

  if (!token) {
    return false;
  }

  // 检查是否是 admin token
  if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
    return true;
  }

  // 检查是否是有效的 JWT token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return !!(decoded && typeof decoded === 'object');
  } catch {
    return false;
  }
}

/**
 * 验证 webhook secret
 */
export function validateSecret(req: Request): boolean {
  const headerSecret = req.header('x-webhook-secret') || '';
  const bodySecret = (req.body && req.body.secret) || '';
  const provided = headerSecret || bodySecret;
  return Boolean(deployConfig.webhookSecret && provided && provided === deployConfig.webhookSecret);
}

/**
 * 验证部署请求的认证：支持已登录用户、API Key 或 webhook secret
 */
export function validateDeployAuth(req: Request): { authorized: boolean; authType: 'user' | 'webhook' | 'apikey' | 'none' } {
  // 优先检查用户认证（来自管理后台）
  if (validateUserAuth(req)) {
    return { authorized: true, authType: 'user' };
  }

  // 检查 API Key 认证（来自 API 调用）
  const apiKey = extractAPIKey(req);
  if (apiKey) {
    const keyRecord = verifyAPIKey(apiKey);
    if (keyRecord) {
      // Check if the API key has deploy permission
      if (keyRecord.permission === 'deploy' || keyRecord.permission === 'full') {
        return { authorized: true, authType: 'apikey' };
      }
    }
  }

  // 检查 webhook secret（来自外部 webhook）
  if (validateSecret(req)) {
    return { authorized: true, authType: 'webhook' };
  }

  return { authorized: false, authType: 'none' };
}

/**
 * 从请求中提取 API Key
 */
function extractAPIKey(req: Request): string | null {
  // Check X-API-Key header
  const xApiKey = req.header('x-api-key');
  if (xApiKey) {
    return xApiKey;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Only treat as API key if it starts with 'dw_'
    if (token.startsWith('dw_')) {
      return token;
    }
  }

  return null;
}

export function validateDeployPayload(payload: DeployRequest): { ok: true } | { ok: false; error: string } {
  // 必填字段：image, port, containerPort
  // name 非必填，会自动生成
  // version 非必填，默认为 "latest"
  const image = payload.image;
  
  if (!image || image === '') {
    return { ok: false, error: 'Missing required field: image' };
  }
  
  if (payload.port === undefined || payload.port === null || payload.port === '') {
    return { ok: false, error: 'Missing required field: port' };
  }
  
  if (payload.containerPort === undefined || payload.containerPort === null || payload.containerPort === '') {
    return { ok: false, error: 'Missing required field: containerPort' };
  }

  // 验证端口号有效性
  const port = Number(payload.port);
  const containerPort = Number(payload.containerPort);
  
  if (isNaN(port) || port < 1 || port > 65535) {
    return { ok: false, error: `Invalid port number: ${payload.port}. Port must be between 1 and 65535.` };
  }
  
  if (isNaN(containerPort) || containerPort < 1 || containerPort > 65535) {
    return { ok: false, error: `Invalid container port number: ${payload.containerPort}. Port must be between 1 and 65535.` };
  }

  // 使用新的镜像白名单系统
  const imageStr = String(image);
  const repositoryId = payload.repositoryId || null;
  
  // 检查镜像是否在白名单中
  const isAllowed = isImageWhitelisted(repositoryId, imageStr);
  if (!isAllowed) {
    return { 
      ok: false, 
      error: `Image "${imageStr}" from repository is not allowed by whitelist. Please check system settings.` 
    };
  }

  return { ok: true };
}
