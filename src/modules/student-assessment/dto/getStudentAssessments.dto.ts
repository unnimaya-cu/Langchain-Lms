import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetStudentAssessmentsDto {
    @IsNumber()
    @IsOptional()
    startIndex?: number;
    
    @IsNumber()
    @IsOptional()
    noOfItems?: number;

    @IsString()
    @IsOptional()
    search: string;

    @IsString()
    @IsOptional()
    status: string;
}