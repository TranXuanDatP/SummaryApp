import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { UserDto } from '../../dtos';
import type { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY_TOKEN } from '../../../constants/tokens';

@CommandHandler(DeactivateUserCommand)
export class DeactivateUserHandler implements ICommandHandler<
  DeactivateUserCommand,
  UserDto
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<UserDto> {
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

    user.deactivate(eventMetadata);

    await this.userRepository.save(user);

    return new UserDto({
      id: user.id,
      email: user.email.value,
      fullName: user.fullName,
      role: user.role.value,
      isActive: user.isActive,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
