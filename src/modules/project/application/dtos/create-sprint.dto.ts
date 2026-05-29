import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateSprintDto {
  @ApiProperty({ description: 'Tên Sprint/Module' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (ISO)', nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (ISO)', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
