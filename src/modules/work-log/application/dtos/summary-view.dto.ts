import { ApiProperty } from '@nestjs/swagger';

export class ProjectBreakdownItem {
  @ApiProperty() projectId: string;
  @ApiProperty() projectName: string;
  @ApiProperty() workLogCount: number;

  constructor(params: { projectId: string; projectName: string; workLogCount: number }) {
    this.projectId = params.projectId;
    this.projectName = params.projectName;
    this.workLogCount = params.workLogCount;
  }
}

export class SummaryViewDto {
  @ApiProperty() period: { month: number; year: number };
  @ApiProperty() totalBusinessDays: number;
  @ApiProperty() loggedDays: number;
  @ApiProperty() completionRate: number;
  @ApiProperty({ type: [String] }) editableGaps: string[];
  @ApiProperty({ type: [ProjectBreakdownItem] }) projectBreakdown: ProjectBreakdownItem[];

  constructor(params: {
    period: { month: number; year: number };
    totalBusinessDays: number;
    loggedDays: number;
    completionRate: number;
    editableGaps: string[];
    projectBreakdown: ProjectBreakdownItem[];
  }) {
    this.period = params.period;
    this.totalBusinessDays = params.totalBusinessDays;
    this.loggedDays = params.loggedDays;
    this.completionRate = params.completionRate;
    this.editableGaps = params.editableGaps;
    this.projectBreakdown = params.projectBreakdown;
  }
}
