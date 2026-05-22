import { ICommand } from 'src/libs/core/application';

export class MarkAllReadCommand implements ICommand {
  constructor(
    public readonly userId: string,
  ) {}
}
