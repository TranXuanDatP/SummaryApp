export class ProjectBreakdownItem {
  projectId: string;
  projectName: string;
  workLogCount: number;

  constructor(params: { projectId: string; projectName: string; workLogCount: number }) {
    this.projectId = params.projectId;
    this.projectName = params.projectName;
    this.workLogCount = params.workLogCount;
  }
}

export class SummaryViewDto {
  period: { month: number; year: number };
  totalBusinessDays: number;
  loggedDays: number;
  completionRate: number;
  editableGaps: string[];
  projectBreakdown: ProjectBreakdownItem[];

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
