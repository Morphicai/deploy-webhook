import { Router } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  createSecretRecord,
  listSecretSummaries,
  removeSecretRecord,
  updateSecretRecord,
} from '../services/secretStore';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

router.use(requireAdmin);

router.get('/', (_req, res) => {
  res.json({ success: true, data: listSecretSummaries() });
});

router.post('/', (req, res) => {
  try {
    const created = createSecretRecord(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const updated = updateSecretRecord(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    removeSecretRecord(id);
    res.json({ success: true });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;
