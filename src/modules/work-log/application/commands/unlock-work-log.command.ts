import { ICommand } from 'src/libs/core/application';

export class UnlockWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly reason: string,
    public readonly managerId: string,
  ) {}
}
