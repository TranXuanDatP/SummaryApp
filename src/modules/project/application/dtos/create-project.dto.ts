import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Project Alpha', description: 'Project name' })
  @IsString()
  @MinLength(1, { message: 'Tên dự án là bắt buộc' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name: string;

  @ApiProperty({ example: 'Project description', description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string;
}
