import { Request, Response, NextFunction } from 'express';

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_TOKEN) {
    res.status(503).json({ success: false, error: 'Admin API disabled: ADMIN_TOKEN not set' });
    return;
  }

  const header = req.header('x-admin-token') || '';
  if (header !== ADMIN_TOKEN) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  next();
}
