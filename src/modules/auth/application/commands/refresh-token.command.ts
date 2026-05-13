import { ICommand } from 'src/libs/core/application';

export class RefreshTokenCommand implements ICommand {
  constructor(public readonly refreshToken: string) {}
}
