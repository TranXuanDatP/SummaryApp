import { CreateUserHandler } from './create-user.handler';
import { DeactivateUserHandler } from './deactivate-user.handler';

export const CommandHandlers = [CreateUserHandler, DeactivateUserHandler];

export * from './create-user.handler';
export * from './deactivate-user.handler';
