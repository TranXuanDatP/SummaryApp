import { GetUserHandler } from './get-user.handler';
import { GetUserListHandler } from './get-user-list.handler';

export const QueryHandlers = [GetUserHandler, GetUserListHandler];

export * from './get-user.handler';
export * from './get-user-list.handler';
