import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { randomUUID } from 'crypto';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';
import { BusinessRuleException } from 'src/libs/core/common';
import { UpdateNotificationPreferenceCommand, PreferenceItem } from '../update-notification-preference.command';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';
import { NotificationType } from '../../../domain/value-objects/notification-type.value-object';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.value-object';
import { NOTIFICATION_REPOSITORY_TOKEN } from '../../../constants/tokens';
import type { INotificationRepository } from '../../../domain/repositories';

@CommandHandler(UpdateNotificationPreferenceCommand)
export class UpdateNotificationPreferenceHandler implements ICommandHandler<UpdateNotificationPreferenceCommand, void> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly repository: INotificationRepository,
  ) {}

  async execute(command: UpdateNotificationPreferenceCommand): Promise<void> {
    for (const item of command.preferences) {
      let type: NotificationType;
      let channel: NotificationChannel;

      try {
        type = new NotificationType(item.type);
        channel = new NotificationChannel(item.channel);
      } catch (error) {
        if (error instanceof DomainException) {
          throw new BusinessRuleException(error.message, error.code, {
            suggestion: 'Kiểm tra lại loại thông báo và kênh',
          });
        }
        throw error;
      }

      const preference = NotificationPreference.create(
        randomUUID(),
        {
          userId: command.userId,
          type,
          channel,
          enabled: item.enabled,
        },
      );

      await this.repository.savePreference(preference);
    }
  }
}
