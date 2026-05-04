import { Router } from 'express';
import { authorize, optionalAuth, requireAuth } from '../../middleware/auth.js';
import {
  approveHackathon,
  createHackathon,
  deleteHackathon,
  getHackathon,
  hackathonAnalytics,
  listHackathons,
  publishHackathon,
  rejectHackathon,
  updateHackathon
} from './hackathon.controller.js';

const router = Router();

router.get('/', optionalAuth, listHackathons);
router.get('/analytics/summary', requireAuth, authorize('SUPER_ADMIN'), hackathonAnalytics);
router.get('/:id', optionalAuth, getHackathon);
router.post('/', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), createHackathon);
router.put('/:id', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), updateHackathon);
router.delete('/:id', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), deleteHackathon);
router.patch('/:id/approve', requireAuth, authorize('SUPER_ADMIN'), approveHackathon);
router.patch('/:id/reject', requireAuth, authorize('SUPER_ADMIN'), rejectHackathon);
router.patch('/:id/publish', requireAuth, authorize('SUPER_ADMIN'), publishHackathon);

export default router;

