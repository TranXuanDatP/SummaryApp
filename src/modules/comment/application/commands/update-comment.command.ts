import { ICommand } from 'src/libs/core/application';

export class UpdateCommentCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly authorId: string,
  ) {}
}
