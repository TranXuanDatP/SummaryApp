import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkLogDto {
  @ApiProperty({
    example: 'Implemented feature X',
    description: 'Work log content',
  })
  @IsString()
  @MinLength(1, { message: 'Nội dung công việc là bắt buộc' })
  @MaxLength(5000, { message: 'Nội dung không được vượt quá 5000 ký tự' })
  content: string;

  @ApiProperty({
    example: 'uuid-project-id',
    description: 'Project ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectId?: string;

  @ApiProperty({
    example: '2026-05-20',
    description: 'Execution date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  executionDate?: string;
}
