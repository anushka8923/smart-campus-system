import { getPagination } from '../../utils/http.js';
import { Notification } from './notification.model.js';

export async function listNotifications(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.readAt = null;
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter)
    ]);
    res.json({ page, limit, total, pages: Math.ceil(total / limit), notifications });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { readAt: new Date() },
      { new: true }
    );
    res.json({ notification });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

