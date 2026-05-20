import { IAggregateRepository } from 'src/libs/core/domain';
import { Comment } from '../entities';

export interface ICommentRepository extends IAggregateRepository<Comment> {}
