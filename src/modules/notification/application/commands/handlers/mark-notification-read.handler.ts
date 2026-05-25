import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { MarkNotificationReadCommand } from '../mark-notification-read.command';
import { NOTIFICATION_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from 'src/libs/core/common';
import type { INotificationRepository } from '../../../domain/repositories';

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<
  MarkNotificationReadCommand,
  { success: boolean }
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly repository: INotificationRepository,
  ) {}

  async execute(
    command: MarkNotificationReadCommand,
  ): Promise<{ success: boolean }> {
    const notification = await this.repository.getById(command.notificationId);
    if (!notification || notification.userId !== command.userId) {
      throw NotFoundException.entity('Notification', command.notificationId, {
        suggestion: 'Kiểm tra lại ID thông báo',
      });
    }

    notification.markAsRead();
    await this.repository.updateReadStatus(
      command.notificationId,
      command.userId,
    );
    return { success: true };
  }
}
