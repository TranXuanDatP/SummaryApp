import { ICommand } from 'src/libs/core/application';

export class DeleteSprintCommand implements ICommand {
  constructor(public readonly sprintId: string) {}
}
