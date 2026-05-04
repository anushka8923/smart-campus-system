import { sendEmail } from './email.service.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { User } from '../modules/users/user.model.js';

export async function createNotification({ user, type, title, message, targetType = 'SYSTEM', targetId, email = true }) {
  const recipient = await User.findById(user);
  if (!recipient) return null;

  const notification = await Notification.create({
    user: recipient._id,
    type,
    title,
    message,
    targetType,
    targetId,
    emailStatus: email && recipient.notificationPreferences?.email ? 'PENDING' : 'SKIPPED'
  });

  if (email && recipient.notificationPreferences?.email) {
    try {
      const result = await sendEmail({ to: recipient.email, subject: title, text: message });
      notification.emailStatus = result.sent ? 'SENT' : 'SKIPPED';
      notification.emailError = result.reason;
      await notification.save();
    } catch (error) {
      notification.emailStatus = 'FAILED';
      notification.emailError = error.message;
      await notification.save();
    }
  }

  return notification;
}

