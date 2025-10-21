import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const headerToken = req.header('x-admin-token');
  const bearer = (req.header('authorization') || '').split(' ');
  const token = headerToken || (bearer[0] === 'Bearer' ? bearer[1] : undefined);

  if (!token) {
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
  } catch {}

  res.status(401).json({ success: false, error: 'Unauthorized' });
}
