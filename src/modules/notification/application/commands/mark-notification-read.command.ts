import { ICommand } from 'src/libs/core/application';

export class MarkNotificationReadCommand implements ICommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {}
}
