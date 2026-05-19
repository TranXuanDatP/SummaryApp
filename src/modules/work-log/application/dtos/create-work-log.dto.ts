import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateWorkLogDto {
  @IsString()
  @MinLength(1, { message: 'Nội dung công việc là bắt buộc' })
  @MaxLength(5000, { message: 'Nội dung không được vượt quá 5000 ký tự' })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectId?: string;

  @IsOptional()
  @IsDateString()
  executionDate?: string;
}
