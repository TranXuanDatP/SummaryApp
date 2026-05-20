import { ApiProperty } from '@nestjs/swagger';

export class CommentDto {
  @ApiProperty() id: string;
  @ApiProperty() workLogId: string;
  @ApiProperty() authorId: string;
  @ApiProperty() authorName: string;
  @ApiProperty() content: string;
  @ApiProperty() version: number;
  @ApiProperty() isDeleted: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(params: {
    id: string;
    workLogId: string;
    authorId: string;
    authorName: string;
    content: string;
    version: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.workLogId = params.workLogId;
    this.authorId = params.authorId;
    this.authorName = params.authorName;
    this.content = params.content;
    this.version = params.version;
    this.isDeleted = params.isDeleted;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
