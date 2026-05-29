import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateSprintDto {
  @ApiPropertyOptional({ description: 'Tên Sprint/Module' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Mô tả', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (ISO)', nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (ISO)', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
