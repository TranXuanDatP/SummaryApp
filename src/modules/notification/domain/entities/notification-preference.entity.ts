import {
  AggregateRoot,
  DomainException,
  DomainErrorCode,
} from 'src/libs/core/domain';
import { NotificationType } from '../value-objects';
import { NotificationChannel } from '../value-objects';

export interface NotificationPreferenceProps {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

export class NotificationPreference extends AggregateRoot {
  private _props: NotificationPreferenceProps;

  get userId(): string {
    return this._props.userId;
  }
  get type(): NotificationType {
    return this._props.type;
  }
  get channel(): NotificationChannel {
    return this._props.channel;
  }
  get enabled(): boolean {
    return this._props.enabled;
  }

  private constructor(
    id: string,
    props: NotificationPreferenceProps,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, undefined, createdAt, updatedAt);
    this._props = props;
  }

  static create(
    id: string,
    props: NotificationPreferenceProps,
  ): NotificationPreference {
    const trimmedId = (id || '').trim();
    if (!trimmedId) {
      throw new DomainException(
        'Notification preference ID is required',
        DomainErrorCode.NOTIFICATION_PREF_ID_REQUIRED,
      );
    }
    if (trimmedId.length > 50) {
      throw new DomainException(
        'Notification preference ID cannot exceed 50 characters',
        DomainErrorCode.NOTIFICATION_PREF_ID_TOO_LONG,
      );
    }

    if (!props.type) {
      throw new DomainException(
        'Notification type is required',
        DomainErrorCode.NOTIFICATION_TYPE_REQUIRED,
      );
    }
    if (!props.channel) {
      throw new DomainException(
        'Notification channel is required',
        DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED,
      );
    }

    const trimmedUserId = (props.userId || '').trim();
    if (!trimmedUserId) {
      throw new DomainException(
        'User ID is required',
        DomainErrorCode.NOTIFICATION_PREF_USER_ID_REQUIRED,
      );
    }
    if (trimmedUserId.length > 50) {
      throw new DomainException(
        'User ID cannot exceed 50 characters',
        DomainErrorCode.NOTIFICATION_PREF_USER_ID_TOO_LONG,
      );
    }

    return new NotificationPreference(trimmedId, {
      userId: trimmedUserId,
      type: props.type,
      channel: props.channel,
      enabled: props.enabled,
    });
  }

  static reconstitute(
    id: string,
    props: NotificationPreferenceProps,
    createdAt: Date,
    updatedAt: Date,
  ): NotificationPreference {
    return new NotificationPreference(id, { ...props }, createdAt, updatedAt);
  }

  updateEnabled(enabled: boolean): void {
    this._props = { ...this._props, enabled };
    this.markAsDirty();
  }
}
