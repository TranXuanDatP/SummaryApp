import { GetUserHandler } from './get-user.handler';
import { GetUserListHandler } from './get-user-list.handler';
import { GetEmployeeListHandler } from './get-employee-list.handler';

export const QueryHandlers = [GetUserHandler, GetUserListHandler, GetEmployeeListHandler];

export * from './get-user.handler';
export * from './get-user-list.handler';
export * from './get-employee-list.handler';
