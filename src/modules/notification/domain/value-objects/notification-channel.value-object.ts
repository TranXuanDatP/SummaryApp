import { BaseValueObject, DomainException, DomainErrorCode } from 'src/libs/core/domain';

export class NotificationChannel extends BaseValueObject {
  public static readonly VALID_CHANNELS = ['in_app', 'email'] as const;

  public readonly value: string;

  constructor(value: string) {
    super();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      throw new DomainException('Notification channel is required', DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED);
    }
    if (!(NotificationChannel.VALID_CHANNELS as readonly string[]).includes(trimmed)) {
      throw new DomainException(
        `Invalid notification channel: ${trimmed}`,
        DomainErrorCode.NOTIFICATION_CHANNEL_INVALID,
      );
    }
    this.value = trimmed;
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
