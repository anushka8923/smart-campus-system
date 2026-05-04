import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return next();

    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('-passwordHash');
    next();
  } catch {
    next();
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}
