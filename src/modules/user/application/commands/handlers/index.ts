import { CreateUserHandler } from './create-user.handler';
import { DeactivateUserHandler } from './deactivate-user.handler';
import { DeleteUserHandler } from './delete-user.handler';

export const CommandHandlers = [
  CreateUserHandler,
  DeactivateUserHandler,
  DeleteUserHandler,
];

export * from './create-user.handler';
export * from './deactivate-user.handler';
export * from './delete-user.handler';
