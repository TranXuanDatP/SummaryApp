import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnlockWorkLogDto {
  @ApiProperty({ example: 'Employee requested correction', description: 'Reason for unlocking' })
  @IsString()
  @MinLength(1, { message: 'reason must not be empty' })
  @MaxLength(1000)
  reason: string;
}
