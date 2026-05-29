import { ICommand } from 'src/libs/core/application';

export class UpdateWorkLogStatusCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly status: 'in_progress' | 'done',
    public readonly employeeId: string,
  ) {}
}
