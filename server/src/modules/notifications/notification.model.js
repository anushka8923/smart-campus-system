import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['REGISTRATION', 'APPROVAL', 'REJECTION', 'REMINDER', 'SYSTEM'],
      default: 'SYSTEM'
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetType: { type: String, enum: ['EVENT', 'HACKATHON', 'SOCIETY', 'SYSTEM'], default: 'SYSTEM' },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    readAt: { type: Date },
    emailStatus: { type: String, enum: ['PENDING', 'SENT', 'SKIPPED', 'FAILED'], default: 'PENDING' },
    emailError: { type: String, trim: true }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

