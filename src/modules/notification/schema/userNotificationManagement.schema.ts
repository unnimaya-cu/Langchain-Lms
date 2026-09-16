import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserNotificationDocument = UserNotification & Document;

@Schema({ timestamps: true })
export class UserNotification {
  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notificationId: Types.ObjectId;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'users', required: true },
        isRead: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  users: { userId: Types.ObjectId; isRead: boolean }[];

  @Prop({type:Boolean, default:false})
  isAdminRead: boolean;


  @Prop({ type: String })
  message?: string;

  // @Prop({ type: Date, default: Date.now })
  // sentAt: Date;
}

export const userNotificationSchema =
  SchemaFactory.createForClass(UserNotification);
