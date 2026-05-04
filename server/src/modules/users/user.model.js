import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'SOCIETY_ADMIN', 'STUDENT'],
      default: 'STUDENT'
    },
    interests: [{ type: String, trim: true, lowercase: true }],
    department: { type: String, trim: true },
    course: { type: String, trim: true },
    year: { type: Number, min: 1, max: 6 },
    bio: { type: String, trim: true, maxlength: 500 },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ interests: 1 });

export const User = mongoose.model('User', userSchema);
