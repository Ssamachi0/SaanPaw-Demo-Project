import { Schema, model, InferSchemaType } from 'mongoose';

/** Message Box: 1:1 thread between a User and a Shelter about a recovered pet. */
const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shelterId: { type: Schema.Types.ObjectId, ref: 'Shelter', required: true, index: true },
    relatedReportType: { type: String, enum: ['lost', 'found'] },
    relatedReportId: { type: Schema.Types.ObjectId },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

conversationSchema.index({ userId: 1, shelterId: 1, relatedReportId: 1 }, { unique: true });

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;
export const Conversation = model('Conversation', conversationSchema);
