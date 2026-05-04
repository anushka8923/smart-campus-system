import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notification.controller.js';

const router = Router();

router.get('/', requireAuth, listNotifications);
router.patch('/read-all', requireAuth, markAllNotificationsRead);
router.patch('/:id/read', requireAuth, markNotificationRead);

export default router;

