import { IsMongoId } from "class-validator";

export class CreateCommentReplyNotificationDto {
  @IsMongoId()
  commentId: string;

  @IsMongoId()
  videoId: string;

  @IsMongoId()
  replierUserId: string;

  @IsMongoId()
  assessmentId: string;
}