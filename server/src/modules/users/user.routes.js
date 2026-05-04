import { Router } from 'express';
import { authorize, requireAuth } from '../../middleware/auth.js';
import { User } from './user.model.js';

const router = Router();

router.get('/', requireAuth, authorize('SUPER_ADMIN'), async (_req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ role: 1, createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
