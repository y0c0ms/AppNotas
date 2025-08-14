import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { syncController } from '../controllers/syncController.js';

const router = Router();

router.post('/', requireAuth, (req, res, next) => {
  try {
    console.log('[SYNC] user', req.auth?.userId, 'ops:', Array.isArray(req.body?.ops) ? req.body.ops.length : 0, 'cursor:', req.body?.clientCursor)
  } catch {}
  return (syncController.sync as any)(req, res, next)
});

export default router;


