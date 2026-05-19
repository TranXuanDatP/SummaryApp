import { IsString, MinLength, MaxLength } from 'class-validator';

export class UnlockWorkLogDto {
  @IsString()
  @MinLength(1, { message: 'reason must not be empty' })
  @MaxLength(1000)
  reason: string;
}
