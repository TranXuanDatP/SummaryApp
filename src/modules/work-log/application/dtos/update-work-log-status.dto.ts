import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkLogStatusDto {
  @ApiProperty({ enum: ['in_progress', 'done'] })
  @IsString()
  @IsIn(['in_progress', 'done'])
  status: 'in_progress' | 'done';
}
