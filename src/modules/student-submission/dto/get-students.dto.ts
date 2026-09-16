import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetStudentsDto {
    @IsOptional()
    @IsString()
    search?: string;

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