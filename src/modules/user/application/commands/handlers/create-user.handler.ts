import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { ConflictException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CreateUserCommand } from '../create-user.command';
import { UserDto } from '../../dtos';
import type { IUserRepository } from '../../../domain/repositories';
import { UserId, UserEmail, UserRole } from '../../../domain/value-objects';
import { User } from '../../../domain/entities';
import {
  USER_REPOSITORY_TOKEN,
  HASH_SERVICE_TOKEN,
} from '../../../constants/tokens';
import type { IHashService } from '../../../domain/services/hash.interface';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<
  CreateUserCommand,
  UserDto
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(HASH_SERVICE_TOKEN)
    private readonly hashService: IHashService,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw ConflictException.duplicate('User', 'email', command.email, {
        code: 'USER_DUPLICATE_EMAIL',
        suggestion: 'Sử dụng email khác hoặc tìm kiếm người dùng hiện có',
      });
    }

    const hashedPassword = await this.hashService.hash(command.password);

    const user = User.create(
      new UserId(randomUUID()),
      {
        email: new UserEmail(command.email),
        password: hashedPassword,
        fullName: command.fullName,
        role: new UserRole(command.role),
      },
      eventMetadata,
    );

    try {
      await this.userRepository.save(user);
    } catch (error: any) {
      if (error?.code === '23505' || error?.constraint?.includes('email')) {
        throw ConflictException.duplicate('User', 'email', command.email, {
          code: 'USER_DUPLICATE_EMAIL',
          suggestion: 'Sử dụng email khác hoặc tìm kiếm người dùng hiện có',
        });
      }
      throw error;
    }

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
