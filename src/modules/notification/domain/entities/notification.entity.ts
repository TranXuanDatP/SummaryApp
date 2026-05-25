import {
  AggregateRoot,
  DomainException,
  DomainErrorCode,
  type IEventMetadata,
} from 'src/libs/core/domain';
import { NotificationType } from '../value-objects';
import { NotificationSentEvent } from '../events';

const MAX_TITLE_LENGTH = 300;
const MAX_CONTENT_LENGTH = 2000;
const MAX_ACTION_LINK_LENGTH = 500;

export interface NotificationProps {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  actionLink: string | null;
  isRead: boolean;
}

export class Notification extends AggregateRoot {
  private _props: NotificationProps;

  get userId(): string {
    return this._props.userId;
  }
  get type(): NotificationType {
    return this._props.type;
  }
  get title(): string {
    return this._props.title;
  }
  get content(): string {
    return this._props.content;
  }
  get actionLink(): string | null {
    return this._props.actionLink;
  }
  get isRead(): boolean {
    return this._props.isRead;
  }

  private constructor(id: string, props: NotificationProps, createdAt?: Date) {
    super(id, undefined, createdAt);
    this._props = props;
  }

  static create(
    id: string,
    props: NotificationProps,
    metadata?: IEventMetadata,
  ): Notification {
    const trimmedId = (id || '').trim();
    if (!trimmedId) {
      throw new DomainException(
        'Notification ID is required',
        DomainErrorCode.NOTIFICATION_ID_REQUIRED,
      );
    }
    if (trimmedId.length > 50) {
      throw new DomainException(
        'Notification ID cannot exceed 50 characters',
        DomainErrorCode.NOTIFICATION_ID_TOO_LONG,
      );
    }

    if (!props.type) {
      throw new DomainException(
        'Notification type is required',
        DomainErrorCode.NOTIFICATION_TYPE_REQUIRED,
      );
    }

    const trimmedUserId = (props.userId || '').trim();
    if (!trimmedUserId) {
      throw new DomainException(
        'User ID is required',
        DomainErrorCode.NOTIFICATION_USER_ID_REQUIRED,
      );
    }
    if (trimmedUserId.length > 50) {
      throw new DomainException(
        'User ID cannot exceed 50 characters',
        DomainErrorCode.NOTIFICATION_USER_ID_TOO_LONG,
      );
    }

    const trimmedTitle = (props.title || '').trim();
    if (!trimmedTitle) {
      throw new DomainException(
        'Title is required',
        DomainErrorCode.NOTIFICATION_TITLE_REQUIRED,
      );
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      throw new DomainException(
        `Title cannot exceed ${MAX_TITLE_LENGTH} characters`,
        DomainErrorCode.NOTIFICATION_TITLE_TOO_LONG,
      );
    }

    const trimmedContent = (props.content || '').trim();
    if (!trimmedContent) {
      throw new DomainException(
        'Content is required',
        DomainErrorCode.NOTIFICATION_CONTENT_REQUIRED,
      );
    }
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      throw new DomainException(
        `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        DomainErrorCode.NOTIFICATION_CONTENT_TOO_LONG,
      );
    }

    const trimmedActionLink = props.actionLink ? props.actionLink.trim() : null;
    if (
      trimmedActionLink &&
      trimmedActionLink.length > MAX_ACTION_LINK_LENGTH
    ) {
      throw new DomainException(
        `Action link cannot exceed ${MAX_ACTION_LINK_LENGTH} characters`,
        DomainErrorCode.NOTIFICATION_ACTION_LINK_TOO_LONG,
      );
    }

    const notification = new Notification(trimmedId, {
      userId: trimmedUserId,
      type: props.type,
      title: trimmedTitle,
      content: trimmedContent,
      actionLink: trimmedActionLink,
      isRead: false,
    });

    notification.addDomainEvent(
      new NotificationSentEvent(
        trimmedId,
        { userId: trimmedUserId, type: props.type.value, title: trimmedTitle },
        metadata,
      ),
    );

    return notification;
  }

  static reconstitute(
    id: string,
    props: NotificationProps,
    createdAt: Date,
  ): Notification {
    return new Notification(id, { ...props }, createdAt);
  }

  markAsRead(): void {
    if (this._props.isRead) return;
    this._props = { ...this._props, isRead: true };
    this.markAsDirty();
  }
}
