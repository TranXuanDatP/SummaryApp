import { IsString, IsBoolean, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PreferenceItemDto {
  @ApiProperty({ description: 'Notification type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Notification channel (in_app or email)' })
  @IsString()
  channel: string;

  @ApiProperty({ description: 'Whether this notification is enabled' })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ type: [PreferenceItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one preference is required' })
  @ArrayMaxSize(16, { message: 'Maximum 16 preferences allowed' })
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto[];
}
