import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class QuestionScoreDto {
    @IsNotEmpty()
    @IsString()
    questionId?: string;

    @IsOptional()
    @IsString()
    score?: string;
}

export class UpdateScoreDto {
    @IsArray()
    @ValidateNested({each:true})
    @Type(() => QuestionScoreDto)
    questions: QuestionScoreDto[]

    @IsString()
    @IsOptional()
    feedback?: string
}