import { ICommand } from 'src/libs/core/application';

export class CreateUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly role: string,
  ) {}
}
