import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateSprintStatusDto {
  @ApiProperty({ enum: ['planning', 'in_progress', 'completed'] })
  @IsString()
  @IsIn(['planning', 'in_progress', 'completed'])
  status: 'planning' | 'in_progress' | 'completed';
}
