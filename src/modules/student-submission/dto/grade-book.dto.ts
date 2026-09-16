import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetGradebookDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    courseId?: string;

    @IsOptional()
    @IsString()
    assessmentType?: string;
}