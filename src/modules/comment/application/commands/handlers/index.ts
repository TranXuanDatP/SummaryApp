import { CreateCommentHandler } from './create-comment.handler';
import { UpdateCommentHandler } from './update-comment.handler';
import { DeleteCommentHandler } from './delete-comment.handler';

export const CommandHandlers = [
  CreateCommentHandler,
  UpdateCommentHandler,
  DeleteCommentHandler,
];
