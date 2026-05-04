import { Router } from 'express';
import { authorize, optionalAuth, requireAuth } from '../../middleware/auth.js';
import {
  approveEvent,
  createEvent,
  deleteEvent,
  eventAnalytics,
  getEvent,
  listEvents,
  publishEvent,
  rejectEvent,
  updateEvent
} from './event.controller.js';

const router = Router();

router.get('/', optionalAuth, listEvents);
router.get('/analytics/summary', requireAuth, authorize('SUPER_ADMIN'), eventAnalytics);
router.get('/:id', optionalAuth, getEvent);
router.post('/', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), createEvent);
router.put('/:id', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), updateEvent);
router.delete('/:id', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), deleteEvent);
router.patch('/:id/approve', requireAuth, authorize('SUPER_ADMIN'), approveEvent);
router.patch('/:id/reject', requireAuth, authorize('SUPER_ADMIN'), rejectEvent);
router.patch('/:id/publish', requireAuth, authorize('SUPER_ADMIN'), publishEvent);

export default router;
