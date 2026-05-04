import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Society } from './society.model.js';
import { User } from '../users/user.model.js';

const societySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(['TECHNICAL', 'CULTURAL', 'OTHER']).default('OTHER'),
  admins: z.array(z.string()).default([]),
  contactEmail: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z
    .object({
      instagram: z.string().url().optional().or(z.literal('')),
      linkedin: z.string().url().optional().or(z.literal('')),
      x: z.string().url().optional().or(z.literal(''))
    })
    .optional()
});

const societyAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function listSocieties(req, res, next) {
  try {
    const filter = { isActive: true };

    if (req.user?.role === 'SOCIETY_ADMIN') {
      filter.admins = req.user._id;
    }

    const societies = await Society.find(filter)
      .sort({ name: 1 })
      .populate('admins', 'name email role');

    res.json({ societies });
  } catch (error) {
    next(error);
  }
}

export async function createSociety(req, res, next) {
  try {
    const data = societySchema.parse(req.body);
    const society = await Society.create({
      ...data,
      contactEmail: data.contactEmail || undefined,
      websiteUrl: data.websiteUrl || undefined
    });
    res.status(201).json({ society });
  } catch (error) {
    next(error);
  }
}

export async function updateSociety(req, res, next) {
  try {
    const data = societySchema.partial().parse(req.body);
    const society = await Society.findByIdAndUpdate(
      req.params.id,
      {
        ...data,
        contactEmail: data.contactEmail || undefined,
        websiteUrl: data.websiteUrl || undefined
      },
      { new: true }
    ).populate('admins', 'name email role');

    if (!society) {
      const error = new Error('Society not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ society });
  } catch (error) {
    next(error);
  }
}

export async function deactivateSociety(req, res, next) {
  try {
    const society = await Society.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!society) {
      const error = new Error('Society not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ society });
  } catch (error) {
    next(error);
  }
}

export async function assignSocietyAdmin(req, res, next) {
  try {
    const data = societyAdminSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const admin = await User.findOneAndUpdate(
      { email: data.email },
      {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'SOCIETY_ADMIN'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const society = await Society.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { admins: admin._id } },
      { new: true }
    ).populate('admins', 'name email role');

    if (!society) {
      const error = new Error('Society not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(201).json({ society, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    next(error);
  }
}
