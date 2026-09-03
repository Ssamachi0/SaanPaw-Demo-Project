import { Schema, model, InferSchemaType } from 'mongoose';

const matchSuggestionSchema = new Schema(
  {
    lostReportId: { type: Schema.Types.ObjectId, ref: 'LostPetReport', required: true, index: true },
    foundReportId: { type: Schema.Types.ObjectId, ref: 'FoundAnimalReport', required: true, index: true },
    similarityScore: { type: Number, required: true },
    status: {
      type: String,
      enum: ['suggested', 'confirmed', 'dismissed'],
      default: 'suggested',
    },
  },
  { timestamps: true },
);

matchSuggestionSchema.index({ lostReportId: 1, foundReportId: 1 }, { unique: true });

export type MatchSuggestionDoc = InferSchemaType<typeof matchSuggestionSchema>;
export const MatchSuggestion = model('MatchSuggestion', matchSuggestionSchema);
