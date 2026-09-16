import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RolePrevileges } from 'src/common/enum/rolePrevilage.enum';
import { StatusType } from 'src/common/enum/status-type.enum';

@Schema()
export class Role extends Document {
  @Prop({ required: true, unique: true })
  roleName: string;

  @Prop({
    type: [String],
    enum: Object.values(RolePrevileges),
    required: true,
  })
  rolePrivileges: RolePrevileges[];

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
