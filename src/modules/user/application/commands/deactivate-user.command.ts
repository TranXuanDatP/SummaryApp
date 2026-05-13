import { ICommand } from 'src/libs/core/application';

export class DeactivateUserCommand implements ICommand {
  constructor(public readonly id: string) {}
}
