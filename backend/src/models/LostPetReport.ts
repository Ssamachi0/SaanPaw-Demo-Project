import { Schema, model, InferSchemaType } from 'mongoose';
import { ANIMAL_TYPES, REPORT_STATUSES } from '../config/constants';

const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const lostPetReportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    animalType: { type: String, enum: ANIMAL_TYPES, required: true },
    breed: { type: String, trim: true },
    color: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrls: { type: [String], default: [] },
    lastSeenLocation: { type: pointSchema, required: true },
    lastSeenAt: { type: Date },
    status: { type: String, enum: REPORT_STATUSES, default: 'active', index: true },
    matchedFoundReportId: { type: Schema.Types.ObjectId, ref: 'FoundAnimalReport' },
    isHiddenByModeration: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'reportedAt', updatedAt: 'updatedAt' } },
);

lostPetReportSchema.index({ lastSeenLocation: '2dsphere' });

export type LostPetReportDoc = InferSchemaType<typeof lostPetReportSchema>;
export const LostPetReport = model('LostPetReport', lostPetReportSchema);
