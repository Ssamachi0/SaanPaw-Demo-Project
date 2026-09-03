import { Schema, model, InferSchemaType } from 'mongoose';

const developerAccountSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'developer', immutable: true },
  },
  { timestamps: true },
);

export type DeveloperAccountDoc = InferSchemaType<typeof developerAccountSchema>;
export const DeveloperAccount = model('DeveloperAccount', developerAccountSchema);
