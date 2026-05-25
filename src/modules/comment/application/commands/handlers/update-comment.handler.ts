import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import {
  NotFoundException,
  ForbiddenException,
  BusinessRuleException,
  DomainException,
} from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UpdateCommentCommand } from '../update-comment.command';
import { CommentDto } from '../../dtos';
import type { ICommentRepository } from '../../../domain/repositories';
import { COMMENT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';

@CommandHandler(UpdateCommentCommand)
export class UpdateCommentHandler implements ICommandHandler<
  UpdateCommentCommand,
  CommentDto
> {
  constructor(
    @Inject(COMMENT_REPOSITORY_TOKEN)
    private readonly repository: ICommentRepository,
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateCommentCommand): Promise<CommentDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const comment = await this.repository.getById(command.id);
    if (!comment) {
      throw NotFoundException.entity('Comment', command.id, {
        suggestion: 'Kiểm tra lại ID nhận xét',
      });
    }

    if (comment.authorId !== command.authorId) {
      throw ForbiddenException.resourceAccessDenied(
        'Comment',
        command.id,
        command.authorId,
      );
    }

    try {
      comment.updateContent(command.content, eventMetadata);
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
