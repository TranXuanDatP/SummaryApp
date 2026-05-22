import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferenceDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() channel: string;
  @ApiProperty() enabled: boolean;

  constructor(params: {
    id: string;
    type: string;
    channel: string;
    enabled: boolean;
  }) {
    this.id = params.id;
    this.type = params.type;
    this.channel = params.channel;
    this.enabled = params.enabled;
  }
}
