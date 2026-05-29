import { ICommand } from 'src/libs/core/application';
import type { WorkType } from '../../../domain/entities/work-log.entity';

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
