import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Good work on this task',
    description: 'Comment content',
  })
  @IsString()
  @MinLength(1, { message: 'Nội dung nhận xét là bắt buộc' })
  @MaxLength(2000, { message: 'Nội dung không được vượt quá 2000 ký tự' })
  content: string;
}
