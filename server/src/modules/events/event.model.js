import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['TECHNICAL', 'CULTURAL', 'WORKSHOP', 'COMPETITION', 'SPORTS', 'SOCIAL', 'OTHER'],
      required: true
    },
    eventType: {
      type: String,
      enum: ['event', 'hackathon', 'workshop', 'competition'],
      default: 'event',
      required: true
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    venue: { type: String, required: true, trim: true },
    capacity: { type: Number, min: 1 },
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
    registrationLink: { type: String, required: true, trim: true },
    registrationUrl: { type: String, trim: true },
    registrationFee: { type: Number, min: 0, default: 0 },
    eligibility: { type: String, trim: true },
    teamSize: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    posterUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'COMPLETED'],
      default: 'PENDING'
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    reminderSentAt: { type: Date }
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ approvalStatus: 1, date: 1 });
eventSchema.index({ category: 1, date: 1 });
eventSchema.index({ eventType: 1, date: 1 });
eventSchema.index({ society: 1, date: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Event = mongoose.model('Event', eventSchema);
