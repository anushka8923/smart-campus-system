import { Router } from 'express';
import { authorize, optionalAuth, requireAuth } from '../../middleware/auth.js';
import { assignSocietyAdmin, createSociety, deactivateSociety, listSocieties, updateSociety } from './society.controller.js';

const router = Router();

router.get('/', optionalAuth, listSocieties);
router.post('/', requireAuth, authorize('SUPER_ADMIN'), createSociety);
router.put('/:id', requireAuth, authorize('SUPER_ADMIN'), updateSociety);
router.post('/:id/admins', requireAuth, authorize('SUPER_ADMIN'), assignSocietyAdmin);
router.delete('/:id', requireAuth, authorize('SUPER_ADMIN'), deactivateSociety);

export default router;
