import { Router } from 'express';
import { authorize, requireAuth } from '../../middleware/auth.js';
import { cancelRegistration, createRegistration, listMyRegistrations, listTargetRegistrations } from './registration.controller.js';

const router = Router();

router.get('/me', requireAuth, authorize('STUDENT'), listMyRegistrations);
router.get('/:targetType/:targetId', requireAuth, authorize('SOCIETY_ADMIN', 'SUPER_ADMIN'), listTargetRegistrations);
router.post('/:eventId', requireAuth, authorize('STUDENT'), createRegistration);
router.post('/:targetType/:targetId/register', requireAuth, authorize('STUDENT'), createRegistration);
router.patch('/:id/cancel', requireAuth, authorize('STUDENT'), cancelRegistration);

export default router;
