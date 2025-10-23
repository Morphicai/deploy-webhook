import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { buildErrorResponse } from '../utils/errors';
import { createUser, hasAnyUser, verifyCredentials } from '../services/userStore';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '12h';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ success: true, data: { hasUser: hasAnyUser() } });
});

router.post('/register', async (req, res) => {
  try {
    if (hasAnyUser()) {
      return res.status(403).json({ success: false, error: 'Registration disabled' });
    }
    const created = await createUser(req.body);
    res.status(201).json({ 
      success: true, 
      data: { 
        user: { 
          id: created.id, 
          email: created.email 
        } 
      } 
    });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

router.post('/login', async (req, res) => {
  try {
    const user = await verifyCredentials(req.body);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ success: true, data: { token, email: user.email } });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;
