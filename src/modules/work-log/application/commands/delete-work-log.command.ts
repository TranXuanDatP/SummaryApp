import { ICommand } from 'src/libs/core/application';

export class DeleteWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly employeeId: string,
    public readonly userRole: string,
  ) {}
}
