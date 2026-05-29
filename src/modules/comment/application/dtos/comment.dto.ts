import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty() id: string;
  @ApiProperty() workLogId: string;
  @ApiProperty() managerId: string;
  @ApiProperty() managerName: string;
  @ApiProperty() content: string;
  @ApiProperty() version: number;
  @ApiProperty() isDeleted: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(params: {
    id: string;
    workLogId: string;
    managerId: string;
    managerName: string;
    content: string;
    version: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.workLogId = params.workLogId;
    this.managerId = params.managerId;
    this.managerName = params.managerName;
    this.content = params.content;
    this.version = params.version;
    this.isDeleted = params.isDeleted;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
