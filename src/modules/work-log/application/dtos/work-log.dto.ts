export class WorkLogDto {
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
