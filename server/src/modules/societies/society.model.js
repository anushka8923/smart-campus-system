import mongoose from 'mongoose';

const societySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: ['TECHNICAL', 'CULTURAL', 'OTHER'], default: 'OTHER' },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    contactEmail: { type: String, trim: true, lowercase: true },
    websiteUrl: { type: String, trim: true },
    socialLinks: {
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      x: { type: String, trim: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

societySchema.index({ category: 1, isActive: 1 });
societySchema.index({ admins: 1 });

export const Society = mongoose.model('Society', societySchema);
