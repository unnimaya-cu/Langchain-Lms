import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document, Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';

export type UserDocument = User & Document;
@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, unique: true })
  userCode: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: Number })
  mobile: number;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ type: String, default: '' })
  location: string;

  @Prop({ type: String, default: null })
  profileImg: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({type: [String], default:[]})
  oldPasswords: string[];

  @Prop({ type: String, default: null })
  resetToken: string;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: Date })
  expiresAt: Date;

  @Prop({ type: Date, default: Date.now })
  joinedDate: Date;

  @Prop({ type: Date, default: null })
  lastLogin: Date;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({ type: Types.ObjectId, ref: 'Role', default: null })
  roleId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId,ref: 'User', default: null })
  createdBy: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ default: Date.now })
  updatedAt: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);
