import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * Feature embedding for one image, used by the Image Recognition Matching feature.
 * No RFID / microchip / GPS-collar data is stored anywhere (Limitation #2) -
 * identification is purely visual.
 */
const imageSignatureSchema = new Schema(
  {
    sourceType: {
      type: String,
      enum: ['lost', 'found', 'shelter_animal'],
      required: true,
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    imageUrl: { type: String, required: true },
    embedding: { type: [Number], required: true },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

export type ImageSignatureDoc = InferSchemaType<typeof imageSignatureSchema>;
export const ImageSignature = model('ImageSignature', imageSignatureSchema);
