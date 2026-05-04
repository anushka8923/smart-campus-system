import { z } from 'zod';
import { invalidateCache, getCache, setCache } from '../../services/cache.service.js';
import { createNotification } from '../../services/notification.service.js';
import { createError, escapeRegex, getPagination, normalizeTags } from '../../utils/http.js';
import { Registration } from '../registrations/registration.model.js';
import { Society } from '../societies/society.model.js';
import { Hackathon } from './hackathon.model.js';

const hackathonSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  category: z.enum(['TECHNICAL', 'AI_ML', 'WEB3', 'HEALTHCARE', 'SUSTAINABILITY', 'OPEN_INNOVATION', 'OTHER']).default('OPEN_INNOVATION'),
  themes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  society: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  submissionDeadline: z.coerce.date().optional(),
  venue: z.string().trim().min(2),
  capacity: z.coerce.number().min(1).optional(),
  minTeamSize: z.coerce.number().min(1).default(1),
  maxTeamSize: z.coerce.number().min(1).default(4),
  problemStatements: z.array(z.string()).default([]),
  prizes: z.array(z.string()).default([]),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  registrationUrl: z.string().url().optional().or(z.literal('')),
  posterUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PENDING']).default('PENDING')
});

function publicStatusFilter() {
  return { approvalStatus: 'APPROVED', status: { $in: ['APPROVED', 'PUBLISHED'] }, visibility: 'PUBLIC' };
}

async function ensureSocietyAdmin(user, societyId) {
  if (user.role === 'SUPER_ADMIN') return Society.findById(societyId);
  return Society.findOne({ _id: societyId, admins: user._id, isActive: true });
}

async function buildScopedFilter(req) {
  const filter = {};
  if (!req.user || req.user.role === 'STUDENT') Object.assign(filter, publicStatusFilter());
  if (req.user?.role === 'SOCIETY_ADMIN') {
    const societies = await Society.find({ admins: req.user._id }).select('_id');
    filter.society = { $in: societies.map((society) => society._id) };
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status && req.user?.role !== 'STUDENT') filter.status = req.query.status;
  if (req.query.society) filter.society = req.query.society;
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }, { themes: regex }];
  }
  return filter;
}

export async function listHackathons(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const cacheKey = `hackathons:${req.user?.role || 'PUBLIC'}:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);
    const filter = await buildScopedFilter(req);
    const [hackathons, total] = await Promise.all([
      Hackathon.find(filter)
        .sort({ isFeatured: -1, startDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('society', 'name category')
        .populate('createdBy approvedBy', 'name email role'),
      Hackathon.countDocuments(filter)
    ]);
    const payload = { page, limit, total, pages: Math.ceil(total / limit), hackathons };
    await setCache(cacheKey, payload, 45);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getHackathon(req, res, next) {
  try {
    const hackathon = await Hackathon.findById(req.params.id)
      .populate('society', 'name category admins')
      .populate('createdBy approvedBy', 'name email role');
    if (!hackathon) throw createError('Hackathon not found', 404);
    if (!req.user || req.user.role === 'STUDENT') {
      if (hackathon.approvalStatus !== 'APPROVED' || !['APPROVED', 'PUBLISHED'].includes(hackathon.status)) {
        throw createError('Hackathon not found', 404);
      }
    }
    if (req.user?.role === 'SOCIETY_ADMIN' && !hackathon.society.admins.some((id) => id.equals(req.user._id))) {
      throw createError('Hackathon not found', 404);
    }
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function createHackathon(req, res, next) {
  try {
    const data = hackathonSchema.parse(req.body);
    if (data.endDate < data.startDate) throw createError('End date must be after start date', 400);
    if (data.maxTeamSize < data.minTeamSize) throw createError('Max team size must be at least min team size', 400);
    const society = await ensureSocietyAdmin(req.user, data.society);
    if (!society) throw createError('You can create hackathons only for societies assigned to you', 403);
    const hackathon = await Hackathon.create({
      ...data,
      tags: normalizeTags(data.tags),
      themes: normalizeTags(data.themes),
      registrationUrl: data.registrationUrl || undefined,
      posterUrl: data.posterUrl || undefined,
      createdBy: req.user._id
    });
    await invalidateCache('hackathons:');
    res.status(201).json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function updateHackathon(req, res, next) {
  try {
    const data = hackathonSchema.partial().parse(req.body);
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) throw createError('Hackathon not found', 404);
    const society = await ensureSocietyAdmin(req.user, data.society || hackathon.society);
    if (!society) throw createError('You can update hackathons only for societies assigned to you', 403);
    Object.assign(hackathon, data);
    if (data.tags) hackathon.tags = normalizeTags(data.tags);
    if (data.themes) hackathon.themes = normalizeTags(data.themes);
    if (hackathon.isModified() && req.user.role === 'SOCIETY_ADMIN') {
      hackathon.status = hackathon.status === 'DRAFT' ? 'DRAFT' : 'PENDING';
      hackathon.approvalStatus = 'PENDING';
      hackathon.approvedBy = undefined;
      hackathon.approvedAt = undefined;
    }
    await hackathon.save();
    await invalidateCache('hackathons:');
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function deleteHackathon(req, res, next) {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) throw createError('Hackathon not found', 404);
    const society = await ensureSocietyAdmin(req.user, hackathon.society);
    if (!society) throw createError('You can delete hackathons only for societies assigned to you', 403);
    hackathon.status = 'ARCHIVED';
    await hackathon.save();
    await invalidateCache('hackathons:');
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function approveHackathon(req, res, next) {
  try {
    const hackathon = await Hackathon.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'APPROVED', status: 'APPROVED', approvedBy: req.user._id, approvedAt: new Date(), rejectionReason: undefined },
      { new: true }
    ).populate('createdBy society', 'name email category');
    if (!hackathon) throw createError('Hackathon not found', 404);
    await createNotification({
      user: hackathon.createdBy._id,
      type: 'APPROVAL',
      title: 'Hackathon approved',
      message: `${hackathon.title} is approved and visible to students.`,
      targetType: 'HACKATHON',
      targetId: hackathon._id
    });
    await invalidateCache('hackathons:');
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function rejectHackathon(req, res, next) {
  try {
    const reason = z.object({ reason: z.string().trim().optional() }).parse(req.body || {}).reason;
    const hackathon = await Hackathon.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'REJECTED', status: 'REJECTED', rejectionReason: reason },
      { new: true }
    ).populate('createdBy society', 'name email category');
    if (!hackathon) throw createError('Hackathon not found', 404);
    await createNotification({
      user: hackathon.createdBy._id,
      type: 'REJECTION',
      title: 'Hackathon needs changes',
      message: reason ? `${hackathon.title} was rejected: ${reason}` : `${hackathon.title} was rejected.`,
      targetType: 'HACKATHON',
      targetId: hackathon._id
    });
    await invalidateCache('hackathons:');
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function publishHackathon(req, res, next) {
  try {
    const hackathon = await Hackathon.findOneAndUpdate(
      { _id: req.params.id, approvalStatus: 'APPROVED' },
      { status: 'PUBLISHED' },
      { new: true }
    );
    if (!hackathon) throw createError('Approved hackathon not found', 404);
    await invalidateCache('hackathons:');
    res.json({ hackathon });
  } catch (error) {
    next(error);
  }
}

export async function hackathonAnalytics(req, res, next) {
  try {
    const [total, pending, approved, registrations] = await Promise.all([
      Hackathon.countDocuments(),
      Hackathon.countDocuments({ approvalStatus: 'PENDING' }),
      Hackathon.countDocuments({ approvalStatus: 'APPROVED' }),
      Registration.countDocuments({ targetType: 'HACKATHON', status: { $ne: 'CANCELLED' } })
    ]);
    res.json({ total, pending, approved, registrations });
  } catch (error) {
    next(error);
  }
}

