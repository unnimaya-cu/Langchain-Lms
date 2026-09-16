import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseAssessmentDto } from './course-assessment.dto';

export class UpdateCourseAssessmentDto extends PartialType(
  CreateCourseAssessmentDto,
) {}
