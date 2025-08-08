import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { syncController } from '../controllers/syncController.js';

const router = Router();

router.post('/', requireAuth, syncController.sync);

export default router;


