import {
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateWorkLogDto {
  @IsString()
  @MinLength(1, { message: 'Nội dung công việc là bắt buộc' })
  @MaxLength(5000, { message: 'Nội dung không được vượt quá 5000 ký tự' })
  content: string;
}
