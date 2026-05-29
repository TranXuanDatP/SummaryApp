import type { CommentDto } from '../../dtos';

export interface ICommentReadDao {
  findById(id: string): Promise<CommentDto | null>;
  findByWorkLogId(workLogId: string): Promise<CommentDto[]>;
  findByWorkLogIds(workLogIds: string[]): Promise<CommentDto[]>;
  countByWorkLogIds(workLogIds: string[]): Promise<number>;
}
