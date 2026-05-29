import { ICommand } from 'src/libs/core/application';

export class CreateSprintCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly startDate: Date | null,
    public readonly endDate: Date | null,
    public readonly sortOrder: number,
  ) {}
}
