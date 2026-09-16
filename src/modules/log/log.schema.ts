// src/logs/schemas/log.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LogDocument = Log & Document;

@Schema()
export class Log {
  @Prop({ required: false })
  activity_log_subject: string;

  @Prop({ required: false })
  activity_log_request: string;

  @Prop({ required: false })
  activity_log_subject_id: number;

  @Prop({ required: false })
  activity_log_response: string;

  @Prop({ required: false })
  activity_log_created_by: number;

  @Prop({ required: false })
  activity_log_action: string;

  @Prop({ required: false })
  activity_log_ip_address: string;

  @Prop({ required: false })
  activity_log_request_method: string;

  @Prop({ required: false })
  activity_log_endpoint: string;

  @Prop({ required: false })
  activity_log_request_files: string;

  @Prop({ required: false })
  activity_log_request_query: string;

  @Prop({ required: false })
  activity_log_request_param: string;

  @Prop({ required: false })
  activity_log_response_time: number;

  @Prop({ required: false })
  activity_log_created_at: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);