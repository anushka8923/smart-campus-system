import { Event } from '../events/event.model.js';
import { Notification } from '../notifications/notification.model.js';
import { Registration } from '../registrations/registration.model.js';
import { Society } from '../societies/society.model.js';
import { User } from '../users/user.model.js';

export async function getDashboardSummary(req, res, next) {
  try {
    if (req.user.role === 'SUPER_ADMIN') {
      const [users, societies, events, hackathons, pendingEvents, registrations] = await Promise.all([
        User.countDocuments(),
        Society.countDocuments({ isActive: true }),
        Event.countDocuments(),
        Event.countDocuments({ eventType: 'hackathon' }),
        Event.countDocuments({ approvalStatus: 'PENDING' }),
        Registration.countDocuments({ status: { $ne: 'CANCELLED' } })
      ]);
      return res.json({ users, societies, events, hackathons, pendingApprovals: pendingEvents, registrations });
    }

    if (req.user.role === 'SOCIETY_ADMIN') {
      const societies = await Society.find({ admins: req.user._id }).select('_id');
      const ids = societies.map((society) => society._id);
      const [events, hackathons, pendingEvents] = await Promise.all([
        Event.countDocuments({ society: { $in: ids } }),
        Event.countDocuments({ society: { $in: ids }, eventType: 'hackathon' }),
        Event.countDocuments({ society: { $in: ids }, approvalStatus: 'PENDING' })
      ]);
      return res.json({ societies: ids.length, events, hackathons, pendingApprovals: pendingEvents });
    }

    const [registrations, unreadNotifications] = await Promise.all([
      Registration.countDocuments({ student: req.user._id, status: { $ne: 'CANCELLED' } }),
      Notification.countDocuments({ user: req.user._id, readAt: null })
    ]);
    res.json({ registrations, unreadNotifications, interests: req.user.interests?.length || 0 });
  } catch (error) {
    next(error);
  }
}
