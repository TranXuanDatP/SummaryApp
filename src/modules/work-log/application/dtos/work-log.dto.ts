import { ApiProperty } from '@nestjs/swagger';
import type { CommentDto } from '@modules/comment/application/dtos';

export class WorkLogDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() employeeId: string;
  @ApiProperty({ nullable: true }) sprintId: string | null;
  @ApiProperty() executionDate: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) workType: string | null;
  @ApiProperty({ enum: ['in_progress', 'done'] }) status: string;
  @ApiProperty() isUnlocked: boolean;
  @ApiProperty({ nullable: true }) unlockedBy: string | null;
  @ApiProperty({ nullable: true }) unlockedAt: string | null;
  @ApiProperty({ nullable: true }) unlockReason: string | null;
  @ApiProperty() version: number;
  @ApiProperty() isEditable: boolean;
  @ApiProperty() editWindowClosesAt: string;
  @ApiProperty() projectName: string;
  @ApiProperty() employeeName: string;
  @ApiProperty({ nullable: true }) sprintName: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [Object], required: false }) comments?: CommentDto[];

  constructor(params: {
    id: string;
    projectId: string;
    employeeId: string;
    sprintId: string | null;
    executionDate: string;
    content: string;
    workType: string | null;
    status: string;
    isUnlocked: boolean;
    unlockedBy: string | null;
    unlockedAt: string | null;
    unlockReason: string | null;
    version: number;
    isEditable: boolean;
    editWindowClosesAt: string;
    projectName: string;
    employeeName: string;
    sprintName: string | null;
    createdAt: Date;
    updatedAt: Date;
    comments?: CommentDto[];
  }) {
    this.id = params.id;
    this.projectId = params.projectId;
    this.employeeId = params.employeeId;
    this.sprintId = params.sprintId;
    this.executionDate = params.executionDate;
    this.content = params.content;
    this.workType = params.workType;
    this.status = params.status;
    this.isUnlocked = params.isUnlocked;
    this.unlockedBy = params.unlockedBy;
    this.unlockedAt = params.unlockedAt;
    this.unlockReason = params.unlockReason;
    this.version = params.version;
    this.isEditable = params.isEditable;
    this.editWindowClosesAt = params.editWindowClosesAt;
    this.projectName = params.projectName;
    this.employeeName = params.employeeName;
    this.sprintName = params.sprintName;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.comments = params.comments;
  }
}
