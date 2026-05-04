import { Router } from 'express';
import { authorize, requireAuth } from '../../middleware/auth.js';
import { recommendForMe } from './recommendation.controller.js';

const router = Router();

router.get('/me', requireAuth, authorize('STUDENT'), recommendForMe);

export default router;

