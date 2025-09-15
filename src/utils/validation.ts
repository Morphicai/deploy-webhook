import { Request } from 'express';
import { deployConfig } from '../config';
import { DeployRequest } from '../types';

export function validateSecret(req: Request): boolean {
  const headerSecret = req.header('x-webhook-secret') || '';
  const bodySecret = (req.body && req.body.secret) || '';
  const provided = headerSecret || bodySecret;
  return Boolean(deployConfig.webhookSecret && provided && provided === deployConfig.webhookSecret);
}

export function validateDeployPayload(payload: DeployRequest): { ok: true } | { ok: false; error: string } {
  const required: Array<keyof DeployRequest> = ['name', 'version', 'repo', 'port', 'containerPort'];
  for (const key of required) {
    if (!payload || payload[key] === undefined || payload[key] === null || payload[key] === '') {
      return { ok: false, error: `Missing required field: ${key}` };
    }
  }

  const repo = String(payload.repo);
  if (deployConfig.imageNameWhitelist.length > 0) {
    const allowed = deployConfig.imageNameWhitelist;
    const isAllowed = allowed.includes(repo);
    if (!isAllowed) {
      return { ok: false, error: `Image repo not allowed by whitelist: ${repo}` };
    }
  }

  return { ok: true };
}
