import { Schema, model, InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderType: { type: String, enum: ['user', 'shelter'], required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'sentAt', updatedAt: false } },
);

export type MessageDoc = InferSchemaType<typeof messageSchema>;
export const Message = model('Message', messageSchema);
