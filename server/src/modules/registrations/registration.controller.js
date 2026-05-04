import { z } from 'zod';
import { invalidateCache } from '../../services/cache.service.js';
import { createNotification } from '../../services/notification.service.js';
import { createError, getPagination } from '../../utils/http.js';
import { Event } from '../events/event.model.js';
import { Hackathon } from '../hackathons/hackathon.model.js';
import { Registration } from './registration.model.js';

const targetSchema = z.object({
  targetType: z.enum(['EVENT', 'HACKATHON']).default('EVENT'),
  targetId: z.string().min(1)
});

const registrationBodySchema = z.object({
  teamName: z.string().trim().optional(),
  members: z.array(z.string()).default([])
});

async function findOpenTarget(targetType, targetId) {
  const Model = targetType === 'EVENT' ? Event : Hackathon;
  const target = await Model.findOne({
    _id: targetId,
    approvalStatus: 'APPROVED',
    status: { $in: ['APPROVED', 'PUBLISHED'] },
    visibility: 'PUBLIC'
  }).populate('society', 'name');
  if (!target) throw createError(`Approved ${targetType.toLowerCase()} not found`, 404);
  if (target.registrationDeadline && target.registrationDeadline < new Date()) {
    throw createError('Registration deadline has passed', 400);
  }
  return target;
}

async function hasCapacity(targetType, target) {
  if (!target.capacity) return true;
  const count = await Registration.countDocuments({
    targetType,
    targetId: target._id,
    status: { $ne: 'CANCELLED' }
  });
  return count < target.capacity;
}

export async function createRegistration(req, res, next) {
  try {
    const params = req.params.eventId
      ? { targetType: 'EVENT', targetId: req.params.eventId }
      : targetSchema.parse(req.params);
    const body = registrationBodySchema.parse(req.body || {});
    const target = await findOpenTarget(params.targetType, params.targetId);
    if (!(await hasCapacity(params.targetType, target))) throw createError('Registration capacity is full', 409);

    const registration = await Registration.findOneAndUpdate(
      { student: req.user._id, targetType: params.targetType, targetId: target._id },
      {
        status: 'REGISTERED',
        targetModel: params.targetType === 'EVENT' ? 'Event' : 'Hackathon',
        event: params.targetType === 'EVENT' ? target._id : undefined,
        teamName: body.teamName,
        members: body.members
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('targetId');

    await createNotification({
      user: req.user._id,
      type: 'REGISTRATION',
      title: `Registered for ${target.title}`,
      message: `Your registration for ${target.title} is confirmed.`,
      targetType: params.targetType,
      targetId: target._id
    });
    await invalidateCache(`recommendations:${req.user._id}`);
    res.status(201).json({ registration });
  } catch (error) {
    next(error);
  }
}

export async function cancelRegistration(req, res, next) {
  try {
    const registration = await Registration.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id, status: { $ne: 'CANCELLED' } },
      { status: 'CANCELLED', cancelledAt: new Date() },
      { new: true }
    );
    if (!registration) throw createError('Registration not found', 404);
    await invalidateCache(`recommendations:${req.user._id}`);
    res.json({ registration });
  } catch (error) {
    next(error);
  }
}

export async function listMyRegistrations(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const filter = { student: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'targetId',
          populate: { path: 'society', select: 'name category' }
        })
        .populate({
          path: 'event',
          populate: { path: 'society', select: 'name category' }
        }),
      Registration.countDocuments(filter)
    ]);
    res.json({ page, limit, total, pages: Math.ceil(total / limit), registrations });
  } catch (error) {
    next(error);
  }
}

export async function listTargetRegistrations(req, res, next) {
  try {
    const params = targetSchema.parse(req.params);
    const { page, limit, skip } = getPagination(req.query, { limit: 30 });
    const filter = { targetType: params.targetType, targetId: params.targetId };
    const [registrations, total] = await Promise.all([
      Registration.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('student', 'name email department year'),
      Registration.countDocuments(filter)
    ]);
    res.json({ page, limit, total, pages: Math.ceil(total / limit), registrations });
  } catch (error) {
    next(error);
  }
}

