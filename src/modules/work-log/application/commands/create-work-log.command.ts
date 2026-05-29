import { ICommand } from 'src/libs/core/application';

export type WorkType = 'code' | 'bug_fix' | 'research' | 'meeting' | 'review' | 'other';

export class CreateWorkLogCommand implements ICommand {
  constructor(
    public readonly content: string,
    public readonly projectId: string | null,
    public readonly employeeId: string,
    public readonly executionDate: Date | null,
    public readonly sprintId: string | null = null,
    public readonly workType: WorkType | null = null,
  ) {}
}
