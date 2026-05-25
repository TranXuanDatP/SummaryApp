import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { MarkAllReadCommand } from '../mark-all-read.command';
import { NOTIFICATION_REPOSITORY_TOKEN } from '../../../constants/tokens';
import type { INotificationRepository } from '../../../domain/repositories';

@CommandHandler(MarkAllReadCommand)
export class MarkAllReadHandler implements ICommandHandler<
  MarkAllReadCommand,
  { success: boolean }
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly repository: INotificationRepository,
  ) {}

  async execute(command: MarkAllReadCommand): Promise<{ success: boolean }> {
    await this.repository.markAllRead(command.userId);
    return { success: true };
  }
}
