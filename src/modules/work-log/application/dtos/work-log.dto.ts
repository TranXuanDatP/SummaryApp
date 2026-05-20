import { ApiProperty } from '@nestjs/swagger';

export class WorkLogDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() employeeId: string;
  @ApiProperty() executionDate: string;
  @ApiProperty() content: string;
  @ApiProperty() isUnlocked: boolean;
  @ApiProperty({ nullable: true }) unlockedBy: string | null;
  @ApiProperty({ nullable: true }) unlockedAt: string | null;
  @ApiProperty({ nullable: true }) unlockReason: string | null;
  @ApiProperty() version: number;
  @ApiProperty() isEditable: boolean;
  @ApiProperty() editWindowClosesAt: string;
  @ApiProperty() projectName: string;
  @ApiProperty() employeeName: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(params: {
    id: string;
    projectId: string;
    employeeId: string;
    executionDate: string;
    content: string;
    isUnlocked: boolean;
    unlockedBy: string | null;
    unlockedAt: string | null;
    unlockReason: string | null;
    version: number;
    isEditable: boolean;
    editWindowClosesAt: string;
    projectName: string;
    employeeName: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.projectId = params.projectId;
    this.employeeId = params.employeeId;
    this.executionDate = params.executionDate;
    this.content = params.content;
    this.isUnlocked = params.isUnlocked;
    this.unlockedBy = params.unlockedBy;
    this.unlockedAt = params.unlockedAt;
    this.unlockReason = params.unlockReason;
    this.version = params.version;
    this.isEditable = params.isEditable;
    this.editWindowClosesAt = params.editWindowClosesAt;
    this.projectName = params.projectName;
    this.employeeName = params.employeeName;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
