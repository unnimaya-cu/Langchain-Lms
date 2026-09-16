import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetTutorStudentsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    courseId?: string;

    @IsOptional()
    @IsString()
    submissionStatus?: string

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsNumber()
    startIndex?: number;

    @IsOptional()
    @IsNumber()
    noOfItems?: number
}