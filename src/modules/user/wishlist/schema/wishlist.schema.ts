import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Types } from 'mongoose';

@Schema({timestamps: true })
export class Wishlist{
@Prop({type:mongoose.Schema.Types.ObjectId, ref:'User',required:true, })
userId : Types.ObjectId

@Prop({type:mongoose.Schema.Types.ObjectId, ref:'Course',required:true })
courseId : Types.ObjectId

@Prop({ type: Date, default: Date.now })
createdAt: Date;

}
export const WishlistSchema = SchemaFactory.createForClass(Wishlist)
