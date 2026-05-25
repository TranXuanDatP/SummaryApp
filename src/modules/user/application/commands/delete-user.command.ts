import { ICommand } from 'src/libs/core/application';

export class DeleteUserCommand implements ICommand {
  constructor(public readonly id: string) {}
}
