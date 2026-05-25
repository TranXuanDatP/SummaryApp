import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeleteUserCommand } from '../delete-user.command';
import type { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY_TOKEN } from '../../../constants/tokens';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<
  DeleteUserCommand,
  { deleted: boolean; id: string }
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(
    command: DeleteUserCommand,
  ): Promise<{ deleted: boolean; id: string }> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const user = await this.userRepository.getById(command.id);
    if (!user) {
      throw NotFoundException.entity('User', command.id, {
        suggestion: 'Kiểm tra lại ID người dùng',
      });
    }

    user.delete();
    await this.userRepository.save(user);

    return { deleted: true, id: command.id };
  }
}
