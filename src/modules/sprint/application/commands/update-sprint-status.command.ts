import { ICommand } from 'src/libs/core/application';

export class UpdateSprintStatusCommand implements ICommand {
  constructor(
    public readonly sprintId: string,
    public readonly status: 'planning' | 'in_progress' | 'completed',
  ) {}
}
