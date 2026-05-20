import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { NotFoundException, BusinessRuleException, DomainException } from 'src/libs/core/common';
import { DomainErrorCode } from 'src/libs/core/domain';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CreateCommentCommand } from '../create-comment.command';
import { CommentDto } from '../../dtos';
import type { ICommentRepository } from '../../../domain/repositories';
import { CommentId } from '../../../domain/value-objects';
import { Comment } from '../../../domain/entities';
import { COMMENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';

@CommandHandler(CreateCommentCommand)
export class CreateCommentHandler implements ICommandHandler<CreateCommentCommand, CommentDto> {
  constructor(
    @Inject(COMMENT_REPOSITORY_TOKEN)
    private readonly repository: ICommentRepository,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateCommentCommand): Promise<CommentDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
      : undefined;

    const workLog = await this.workLogReadDao.findById(command.workLogId);
    if (!workLog) {
      throw NotFoundException.entity('WorkLog', command.workLogId, {
        suggestion: 'Kiểm tra lại ID WorkLog',
      });
    }

    let comment: Comment;
    try {
      comment = Comment.create(
        new CommentId(randomUUID()),
        { workLogId: command.workLogId, authorId: command.authorId, content: command.content },
        eventMetadata,
      );
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BusinessRuleException(error.message, error.code, {
          suggestion: 'Kiểm tra lại nội dung nhận xét',
        });
      }
      throw error;
    }

    await this.repository.save(comment);

    const author = await this.userReadDao.findById(command.authorId);

    return new CommentDto({
      id: comment.id,
      workLogId: comment.workLogId,
      authorId: comment.authorId,
      authorName: author?.fullName || '',
      content: comment.content,
      version: comment.version,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  }
}
