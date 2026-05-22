import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) actionLink: string | null;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: Date;

  constructor(params: {
    id: string;
    type: string;
    title: string;
    content: string;
    actionLink: string | null;
    isRead: boolean;
    createdAt: Date;
  }) {
    this.id = params.id;
    this.type = params.type;
    this.title = params.title;
    this.content = params.content;
    this.actionLink = params.actionLink;
    this.isRead = params.isRead;
    this.createdAt = params.createdAt;
  }
}
