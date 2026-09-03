import { Schema, model, InferSchemaType } from 'mongoose';
import { NOTIFICATION_TYPES } from '../config/constants';

const notificationSchema = new Schema(
  {
    audienceType: { type: String, enum: ['user', 'shelter'], required: true },
    audienceId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    refId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);
