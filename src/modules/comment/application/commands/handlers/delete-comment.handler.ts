import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { NotFoundException, ForbiddenException, BusinessRuleException, DomainException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeleteCommentCommand } from '../delete-comment.command';
import type { ICommentRepository } from '../../../domain/repositories';
import { COMMENT_REPOSITORY_TOKEN } from '../../../constants/tokens';

@CommandHandler(DeleteCommentCommand)
export class DeleteCommentHandler implements ICommandHandler<DeleteCommentCommand, { deleted: boolean; id: string }> {
  constructor(
    @Inject(COMMENT_REPOSITORY_TOKEN)
    private readonly repository: ICommentRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeleteCommentCommand): Promise<{ deleted: boolean; id: string }> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
      : undefined;

    const comment = await this.repository.getById(command.id);
    if (!comment) {
      throw NotFoundException.entity('Comment', command.id, {
        suggestion: 'Kiểm tra lại ID nhận xét',
      });
    }

    if (comment.authorId !== command.authorId) {
      throw ForbiddenException.resourceAccessDenied('Comment', command.id, command.authorId);
    }

    try {
      comment.delete(eventMetadata);
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BusinessRuleException(error.message, error.code, {
          suggestion: 'Nhận xét đã bị xóa',
        });
      }
      throw error;
    }

    await this.repository.save(comment);
    return { deleted: true, id: command.id };
  }
}
