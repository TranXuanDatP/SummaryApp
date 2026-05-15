import { ICommand } from 'src/libs/core/application';

export class MergeProjectsCommand implements ICommand {
  constructor(
    public readonly targetProjectId: string,
    public readonly sourceProjectIds: string[],
    public readonly performedBy: string,
  ) {}
}
