import { z } from 'zod';
import { invalidateCache, getCache, setCache } from '../../services/cache.service.js';
import { createNotification } from '../../services/notification.service.js';
import { createError, escapeRegex, getPagination, normalizeTags } from '../../utils/http.js';
import { Registration } from '../registrations/registration.model.js';
import { Society } from '../societies/society.model.js';
import { User } from '../users/user.model.js';
import { Event } from './event.model.js';

const DEFAULT_REGISTRATION_LINK = 'https://example.com/register';
const DEFAULT_POSTER_URL = 'https://placehold.co/600x400?text=Event+Poster';

const eventSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  category: z.enum(['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'COMPETITION', 'SPORTS', 'SOCIAL', 'OTHER']),
  eventType: z.enum(['event', 'hackathon', 'workshop', 'competition']).default('event'),
  tags: z.array(z.string()).default([]),
  society: z.string().min(1),
  date: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  venue: z.string().trim().min(2),
  capacity: z.coerce.number().min(1).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  registrationLink: z.string().optional().or(z.literal('')),
  registrationUrl: z.string().optional().or(z.literal('')),
  registrationFee: z.coerce.number().min(0).default(0),
  eligibility: z.string().trim().optional().or(z.literal('')),
  teamSize: z.string().trim().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  posterUrl: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PENDING']).default('PENDING')
});

function hasHttpProtocol(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function sanitizeUrl(value, fallback) {
  const candidate = String(value || '').trim();
  return hasHttpProtocol(candidate) ? candidate : fallback;
}

function sanitizeEventUrls(data) {
  const registrationLink = sanitizeUrl(data.registrationLink || data.registrationUrl, DEFAULT_REGISTRATION_LINK);
  const posterUrl = sanitizeUrl(data.posterUrl, DEFAULT_POSTER_URL);
  return {
    ...data,
    registrationLink,
    registrationUrl: registrationLink,
    posterUrl
  };
}

function publicStatusFilter() {
  return { approvalStatus: 'APPROVED', status: { $in: ['APPROVED', 'PUBLISHED'] }, visibility: 'PUBLIC', date: { $gte: new Date() } };
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
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.status && req.user?.role !== 'STUDENT') filter.status = req.query.status;
  if (req.query.society && req.user?.role !== 'SOCIETY_ADMIN') filter.society = req.query.society;
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  return filter;
}

export async function listEvents(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const cacheKey = `events:${req.user?.role || 'PUBLIC'}:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const filter = await buildScopedFilter(req);
    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ isFeatured: -1, date: 1 })
        .skip(skip)
        .limit(limit)
        .populate('society', 'name category')
        .populate('createdBy approvedBy', 'name email role'),
      Event.countDocuments(filter)
    ]);
    const payload = { page, limit, total, pages: Math.ceil(total / limit), events };
    await setCache(cacheKey, payload, 45);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id)
      .populate('society', 'name category admins')
      .populate('createdBy approvedBy', 'name email role');
    if (!event) throw createError('Event not found', 404);
    if (!req.user || req.user.role === 'STUDENT') {
      if (event.approvalStatus !== 'APPROVED' || !['APPROVED', 'PUBLISHED'].includes(event.status)) {
        throw createError('Event not found', 404);
      }
    }
    if (req.user?.role === 'SOCIETY_ADMIN' && !event.society.admins.some((id) => id.equals(req.user._id))) {
      throw createError('Event not found', 404);
    }
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const data = sanitizeEventUrls(eventSchema.parse(req.body));
    const society = await ensureSocietyAdmin(req.user, data.society);
    if (!society) throw createError('You can create events only for societies assigned to you', 403);

    const event = await Event.create({
      ...data,
      tags: normalizeTags(data.tags),
      createdBy: req.user._id,
      approvalStatus: data.status === 'DRAFT' ? 'PENDING' : 'PENDING'
    });
    await invalidateCache('events:');
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const data = sanitizeEventUrls(eventSchema.partial().parse(req.body));
    const event = await Event.findById(req.params.id);
    if (!event) throw createError('Event not found', 404);
    const society = await ensureSocietyAdmin(req.user, data.society || event.society);
    if (!society) throw createError('You can update events only for societies assigned to you', 403);
    Object.assign(event, data, data.tags ? { tags: normalizeTags(data.tags) } : {});
    if (event.isModified() && req.user.role === 'SOCIETY_ADMIN') {
      event.status = event.status === 'DRAFT' ? 'DRAFT' : 'PENDING';
      event.approvalStatus = 'PENDING';
      event.approvedBy = undefined;
      event.approvedAt = undefined;
    }
    await event.save();
    await invalidateCache('events:');
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw createError('Event not found', 404);
    const society = await ensureSocietyAdmin(req.user, event.society);
    if (!society) throw createError('You can delete events only for societies assigned to you', 403);
    event.status = 'ARCHIVED';
    await event.save();
    await invalidateCache('events:');
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function approveEvent(req, res, next) {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'APPROVED', status: 'APPROVED', approvedBy: req.user._id, approvedAt: new Date(), rejectionReason: undefined },
      { new: true }
    ).populate('createdBy society', 'name email category');
    if (!event) throw createError('Event not found', 404);
    await createNotification({
      user: event.createdBy._id,
      type: 'APPROVAL',
      title: 'Event approved',
      message: `${event.title} is approved and visible to students.`,
      targetType: 'EVENT',
      targetId: event._id
    });
    await notifyMatchingStudents(event);
    await invalidateCache('events:');
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

async function notifyMatchingStudents(event) {
  const text = [
    event.title,
    event.description,
    event.category,
    event.eventType,
    ...(event.tags || [])
  ].join(' ').toLowerCase();

  const students = await User.find({ role: 'STUDENT' }).select('interests');
  const matchedStudents = students.filter((student) => {
    const interests = student.interests || [];
    if (interests.length === 0) return false;
    return interests.some((interest) => text.includes(String(interest).toLowerCase()));
  });

  await Promise.all(
    matchedStudents.map((student) =>
      createNotification({
        user: student._id,
        type: 'APPROVAL',
        title: 'New event for your interests',
        message: `${event.title} is now open. Register before ${event.registrationDeadline.toLocaleDateString('en-IN')}.`,
        targetType: 'EVENT',
        targetId: event._id
      })
    )
  );
}

export async function rejectEvent(req, res, next) {
  try {
    const reason = z.object({ reason: z.string().trim().optional() }).parse(req.body || {}).reason;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'REJECTED', status: 'REJECTED', rejectionReason: reason },
      { new: true }
    ).populate('createdBy society', 'name email category');
    if (!event) throw createError('Event not found', 404);
    await createNotification({
      user: event.createdBy._id,
      type: 'REJECTION',
      title: 'Event needs changes',
      message: reason ? `${event.title} was rejected: ${reason}` : `${event.title} was rejected.`,
      targetType: 'EVENT',
      targetId: event._id
    });
    await invalidateCache('events:');
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function publishEvent(req, res, next) {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, approvalStatus: 'APPROVED' },
      { status: 'PUBLISHED' },
      { new: true }
    );
    if (!event) throw createError('Approved event not found', 404);
    await invalidateCache('events:');
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function eventAnalytics(req, res, next) {
  try {
    const [total, pending, approved, registrations] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ approvalStatus: 'PENDING' }),
      Event.countDocuments({ approvalStatus: 'APPROVED' }),
      Registration.countDocuments({ targetType: 'EVENT', status: { $ne: 'CANCELLED' } })
    ]);
    res.json({ total, pending, approved, registrations });
  } catch (error) {
    next(error);
  }
}
