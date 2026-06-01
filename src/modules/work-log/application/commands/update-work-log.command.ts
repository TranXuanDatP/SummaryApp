import { ICommand } from 'src/libs/core/application';

import type { WorkType } from './create-work-log.command';

export class UpdateWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly employeeId: string,
    public readonly sprintId?: string | null,
    public readonly workType?: WorkType | null,
  ) {}
}
