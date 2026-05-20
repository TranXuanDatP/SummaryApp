import { ICommand } from 'src/libs/core/application';

export class DeleteCommentCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly authorId: string,
  ) {}
}
