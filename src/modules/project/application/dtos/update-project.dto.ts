import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tên dự án không được để trống' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string | null;
}
