import { IsString, MinLength, MaxLength, IsOptional, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkLogDto {
  @ApiProperty({
    example: 'Updated work content',
    description: 'Work log content',
  })
  @IsString()
  @MinLength(1, { message: 'Nội dung công việc là bắt buộc' })
  @MaxLength(5000, { message: 'Nội dung không được vượt quá 5000 ký tự' })
  content: string;

  @ApiProperty({
    example: 'uuid-sprint-id',
    description: 'Sprint ID — send null to clear',
    required: false,
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sprintId?: string | null;

  @ApiProperty({
    example: 'code',
    description: 'Work type — send null to clear',
    required: false,
    enum: ['code', 'bug_fix', 'research', 'meeting', 'review', 'other'],
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsIn(['code', 'bug_fix', 'research', 'meeting', 'review', 'other'])
  @IsOptional()
  workType?: string | null;
}
