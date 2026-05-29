import { ApiProperty } from '@nestjs/swagger';

export class CommentSummaryDto {
  @ApiProperty() managerName: string;
  @ApiProperty() content: string;

  constructor(params: { managerName: string; content: string }) {
    this.managerName = params.managerName;
    this.content = params.content;
  }
}

export class MonthlyReportEntryDto {
  @ApiProperty() id: string;
  @ApiProperty() date: string;
  @ApiProperty() projectId: string;
  @ApiProperty() projectName: string;
  @ApiProperty() employeeId: string;
  @ApiProperty() employeeName: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: ['in_progress', 'done'] }) status: string;
  @ApiProperty() isEditable: boolean;
  @ApiProperty() editWindowClosesAt: string;
  @ApiProperty() version: number;
  @ApiProperty({ type: [CommentSummaryDto] }) comments: CommentSummaryDto[];

  constructor(params: {
    id: string;
    date: string;
    projectId: string;
    projectName: string;
    employeeId: string;
    employeeName: string;
    content: string;
    status: string;
    isEditable: boolean;
    editWindowClosesAt: string;
    version: number;
    comments: CommentSummaryDto[];
  }) {
    this.id = params.id;
    this.date = params.date;
    this.projectId = params.projectId;
    this.projectName = params.projectName;
    this.employeeId = params.employeeId;
    this.employeeName = params.employeeName;
    this.content = params.content;
    this.status = params.status;
    this.isEditable = params.isEditable;
    this.editWindowClosesAt = params.editWindowClosesAt;
    this.version = params.version;
    this.comments = params.comments;
  }
}
