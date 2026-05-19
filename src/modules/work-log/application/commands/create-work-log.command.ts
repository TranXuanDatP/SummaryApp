import { ICommand } from 'src/libs/core/application';

export class CreateWorkLogCommand implements ICommand {
  constructor(
    public readonly content: string,
    public readonly projectId: string | null,
    public readonly employeeId: string,
    public readonly executionDate: Date | null,
  ) {}
}
