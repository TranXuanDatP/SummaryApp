import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1, { message: 'Tên dự án là bắt buộc' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string;
}
