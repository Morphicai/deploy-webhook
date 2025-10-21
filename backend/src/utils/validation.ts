import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { deployConfig } from '../config';
import { DeployRequest } from '../types';
import { isImageWhitelisted } from '../services/imageWhitelistStore';

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
 * 验证部署请求的认证：支持已登录用户或 webhook secret
 */
export function validateDeployAuth(req: Request): { authorized: boolean; authType: 'user' | 'webhook' | 'none' } {
  // 优先检查用户认证（来自管理后台）
  if (validateUserAuth(req)) {
    return { authorized: true, authType: 'user' };
  }

  // 检查 webhook secret（来自外部 webhook）
  if (validateSecret(req)) {
    return { authorized: true, authType: 'webhook' };
  }

  return { authorized: false, authType: 'none' };
}

export function validateDeployPayload(payload: DeployRequest): { ok: true } | { ok: false; error: string } {
  // 向后兼容：如果提供了 repo 但没有 image，使用 repo 作为 image
  const image = payload.image || payload.repo;
  
  // 必填字段：image, port, containerPort
  // name 非必填，会自动生成
  // version 非必填，默认为 "latest"
  if (!image || image === '') {
    return { ok: false, error: 'Missing required field: image (or repo for backward compatibility)' };
  }
  
  if (payload.port === undefined || payload.port === null || payload.port === '') {
    return { ok: false, error: 'Missing required field: port' };
  }
  
  if (payload.containerPort === undefined || payload.containerPort === null || payload.containerPort === '') {
    return { ok: false, error: 'Missing required field: containerPort' };
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

  // 向后兼容：检查旧的环境变量白名单（如果配置了）
  if (deployConfig.imageNameWhitelist.length > 0) {
    const allowed = deployConfig.imageNameWhitelist;
    const isAllowedLegacy = allowed.includes(imageStr);
    if (!isAllowedLegacy) {
      return { ok: false, error: `Image not allowed by legacy whitelist: ${imageStr}` };
    }
  }

  return { ok: true };
}
