import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({
    example: 'Updated Name',
    description: 'Project name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tên dự án không được để trống' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name?: string;

  @ApiProperty({
    example: 'Updated description',
    description: 'Project description',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string | null;
}
