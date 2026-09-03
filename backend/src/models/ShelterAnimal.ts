import { Schema, model, InferSchemaType } from 'mongoose';
import { ANIMAL_TYPES } from '../config/constants';

const shelterAnimalSchema = new Schema(
  {
    shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', required: true, index: true },
    name: { type: String, trim: true },
    animalType: { type: String, enum: ANIMAL_TYPES, required: true },
    breed: { type: String, trim: true },
    color: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrls: { type: [String], default: [] },
    intakeReason: { type: String, trim: true },
    adoptionStatus: {
      type: String,
      enum: ['in_care', 'available', 'adopted'],
      default: 'in_care',
    },
    // "Recovered Animals Posting" - flags animals the shelter recovered/rescued
    // and is publicly showing so owners can identify them.
    isRecoveredPost: { type: Boolean, default: false },
    intakeDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type ShelterAnimalDoc = InferSchemaType<typeof shelterAnimalSchema>;
export const ShelterAnimal = model('ShelterAnimal', shelterAnimalSchema);
