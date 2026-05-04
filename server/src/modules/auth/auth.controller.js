import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { User } from '../users/user.model.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  interests: z.array(z.string()).default([]),
  department: z.string().optional(),
  course: z.string().optional(),
  year: z.coerce.number().min(1).max(6).optional()
}).strict();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function signToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await User.findOne({ email: data.email });

    if (existingUser) {
      const error = new Error('Email is already registered');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const interests = [...new Set(data.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean))];
    const user = await User.create({ ...data, role: 'STUDENT', interests, passwordHash });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
        department: user.department,
        course: user.course,
        year: user.year,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
        department: user.department,
        course: user.course,
        year: user.year,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      interests: req.user.interests,
      department: req.user.department,
      course: req.user.course,
      year: req.user.year,
      notificationPreferences: req.user.notificationPreferences
    }
  });
}
