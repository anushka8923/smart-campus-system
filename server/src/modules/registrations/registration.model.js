import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['EVENT', 'HACKATHON'], default: 'EVENT', required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    targetModel: { type: String, enum: ['Event', 'Hackathon'], required: true, default: 'Event' },
    status: {
      type: String,
      enum: ['REGISTERED', 'CANCELLED', 'CHECKED_IN', 'SUBMITTED', 'WAITLISTED'],
      default: 'REGISTERED'
    },
    teamName: { type: String, trim: true },
    members: [{ type: String, trim: true }],
    checkedInAt: { type: Date },
    cancelledAt: { type: Date }
  },
  { timestamps: true }
);

registrationSchema.index({ student: 1, targetType: 1, targetId: 1 }, { unique: true });
registrationSchema.index({ targetType: 1, targetId: 1, status: 1 });

export const Registration = mongoose.model('Registration', registrationSchema);
