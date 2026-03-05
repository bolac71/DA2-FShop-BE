import { Type } from 'class-transformer';
import { IsOptional, IsNumberString, IsString, IsNumber, IsIn, ArrayNotEmpty } from 'class-validator';
import { NumberOptional, StringOptional } from 'src/decorators/dto.decorator';

export class QueryDto {
    @NumberOptional()
    page?: number;

    @NumberOptional()
    limit?: number;

    @StringOptional()
    search?: string;

    @StringOptional()
    sortBy?: string;
    
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC';
}
