import { ICommand } from 'src/libs/core/application';

export class CreateCommentCommand implements ICommand {
  constructor(
    public readonly workLogId: string,
    public readonly content: string,
    public readonly authorId: string,
  ) {}
}
