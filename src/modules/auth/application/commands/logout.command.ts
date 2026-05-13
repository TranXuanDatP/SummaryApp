import { ICommand } from 'src/libs/core/application';

export class LogoutCommand implements ICommand {
  constructor(public readonly refreshToken: string) {}
}
