import { ICommand } from 'src/libs/core/application';

export class CreateProjectCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly description: string | null,
  ) {}
}
