import { ICommand } from 'src/libs/core/application';

export class UpdateProjectCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly description?: string | null,
  ) {}
}
