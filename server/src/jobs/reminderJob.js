import { env } from '../config/env.js';
import { createNotification } from '../services/notification.service.js';
import { Event } from '../modules/events/event.model.js';
import { Hackathon } from '../modules/hackathons/hackathon.model.js';
import { Registration } from '../modules/registrations/registration.model.js';
import { User } from '../modules/users/user.model.js';

async function sendRemindersFor(Model, targetType, dateField) {
  const now = new Date();
  const until = new Date(now.getTime() + env.REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  const items = await Model.find({
    approvalStatus: 'APPROVED',
    status: { $in: ['APPROVED', 'PUBLISHED'] },
    reminderSentAt: null,
    [dateField]: { $gte: now, $lte: until }
  }).select('title');

  for (const item of items) {
    const registrations = await Registration.find({
      targetType,
      targetId: item._id,
      status: { $ne: 'CANCELLED' }
    }).select('student');

    await Promise.all(
      registrations.map((registration) =>
        createNotification({
          user: registration.student,
          type: 'REMINDER',
          title: `${item.title} is coming up`,
          message: `Reminder: ${item.title} starts within ${env.REMINDER_HOURS_BEFORE} hours.`,
          targetType,
          targetId: item._id
        })
      )
    );

    item.reminderSentAt = new Date();
    await item.save();
  }
}

async function sendStudentDeadlineReminders() {
  const now = new Date();
  const until = new Date(now.getTime() + env.REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
  const events = await Event.find({
    approvalStatus: 'APPROVED',
    status: { $in: ['APPROVED', 'PUBLISHED'] },
    reminderSentAt: null,
    registrationDeadline: { $gte: now, $lte: until }
  }).select('title category eventType tags registrationDeadline');

  if (events.length === 0) return;

  const students = await User.find({ role: 'STUDENT' }).select('interests');
  for (const event of events) {
    const text = [event.title, event.category, event.eventType, ...(event.tags || [])].join(' ').toLowerCase();
    const matchedStudents = students.filter((student) => {
      const interests = student.interests || [];
      return interests.length === 0 || interests.some((interest) => text.includes(String(interest).toLowerCase()));
    });

    await Promise.all(
      matchedStudents.map((student) =>
        createNotification({
          user: student._id,
          type: 'REMINDER',
          title: 'Registration deadline reminder',
          message: `${event.title} registration closes soon.`,
          targetType: 'EVENT',
          targetId: event._id
        })
      )
    );

    event.reminderSentAt = new Date();
    await event.save();
  }
}

export function startReminderJob() {
  if (env.NODE_ENV === 'test') return;
  const run = async () => {
    try {
      await sendRemindersFor(Event, 'EVENT', 'date');
      await sendRemindersFor(Hackathon, 'HACKATHON', 'startDate');
      await sendStudentDeadlineReminders();
    } catch (error) {
      console.warn(`Reminder job failed: ${error.message}`);
    }
  };
  setTimeout(run, 5000);
  setInterval(run, 60 * 60 * 1000);
}
