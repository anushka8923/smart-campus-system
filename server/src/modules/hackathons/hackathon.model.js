import mongoose from 'mongoose';

const hackathonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['TECHNICAL', 'AI_ML', 'WEB3', 'HEALTHCARE', 'SUSTAINABILITY', 'OPEN_INNOVATION', 'OTHER'],
      default: 'OPEN_INNOVATION'
    },
    themes: [{ type: String, trim: true, lowercase: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    society: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    submissionDeadline: { type: Date },
    venue: { type: String, required: true, trim: true },
    capacity: { type: Number, min: 1 },
    minTeamSize: { type: Number, min: 1, default: 1 },
    maxTeamSize: { type: Number, min: 1, default: 4 },
    problemStatements: [{ type: String, trim: true }],
    prizes: [{ type: String, trim: true }],
    registrationUrl: { type: String, trim: true },
    posterUrl: { type: String, trim: true },
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'],
      default: 'PENDING'
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    judgingStatus: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    reminderSentAt: { type: Date }
  },
  { timestamps: true }
);

hackathonSchema.index({ status: 1, startDate: 1 });
hackathonSchema.index({ approvalStatus: 1, startDate: 1 });
hackathonSchema.index({ category: 1, startDate: 1 });
hackathonSchema.index({ society: 1, startDate: 1 });
hackathonSchema.index({ title: 'text', description: 'text', tags: 'text', themes: 'text' });

export const Hackathon = mongoose.model('Hackathon', hackathonSchema);

