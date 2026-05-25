import { ICommand } from 'src/libs/core/application';

export class DeleteProjectCommand implements ICommand {
  constructor(public readonly id: string) {}
}
