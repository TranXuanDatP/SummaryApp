import type { CommentDto } from '../../dtos';

export interface ICommentReadDao {
  findById(id: string): Promise<CommentDto | null>;
  findByWorkLogId(workLogId: string): Promise<CommentDto[]>;
}
