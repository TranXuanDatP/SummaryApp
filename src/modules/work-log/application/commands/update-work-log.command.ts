import { ICommand } from 'src/libs/core/application';

export class UpdateWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly employeeId: string,
  ) {}
}
