import { Notification, NotificationProps } from './notification.entity';
import { NotificationType } from '../value-objects';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';
import { NotificationSentEvent } from '../events';

describe('Notification', () => {
  const validProps: NotificationProps = {
    userId: 'user-123',
    type: new NotificationType('comment_received'),
    title: 'Manager commented on your work',
    content: 'John commented on your WorkLog for 2026-05-20',
    actionLink: '/work-logs/abc-123',
    isRead: false,
  };

  describe('create', () => {
    it('should create notification with valid props', () => {
      const notification = Notification.create('notif-1', validProps);

      expect(notification.id).toBe('notif-1');
      expect(notification.userId).toBe('user-123');
      expect(notification.type.value).toBe('comment_received');
      expect(notification.title).toBe('Manager commented on your work');
      expect(notification.content).toBe(
        'John commented on your WorkLog for 2026-05-20',
      );
      expect(notification.actionLink).toBe('/work-logs/abc-123');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should emit NotificationSentEvent on create', () => {
      const notification = Notification.create('notif-1', validProps);
      const events = notification.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].aggregateId).toBe('notif-1');
      expect(events[0].aggregateType).toBe('Notification');
      expect(events[0].eventType).toBe('NotificationSent');
      expect(events[0].data).toEqual({
        userId: 'user-123',
        type: 'comment_received',
        title: 'Manager commented on your work',
      });
    });

    it('should set isRead to false regardless of input', () => {
      const propsWithRead = { ...validProps, isRead: true };
      const notification = Notification.create('notif-1', propsWithRead);
      expect(notification.isRead).toBe(false);
    });

    it('should allow null actionLink', () => {
      const props = { ...validProps, actionLink: null };
      const notification = Notification.create('notif-1', props);
      expect(notification.actionLink).toBeNull();
    });

    it('should trim all string fields', () => {
      const props: NotificationProps = {
        userId: '  user-123  ',
        type: new NotificationType('comment_received'),
        title: '  Hello World  ',
        content: '  Content here  ',
        actionLink: '  /link  ',
        isRead: false,
      };
      const notification = Notification.create('notif-1', props);
      expect(notification.userId).toBe('user-123');
      expect(notification.title).toBe('Hello World');
      expect(notification.content).toBe('Content here');
      expect(notification.actionLink).toBe('/link');
    });

    it('should throw NOTIFICATION_USER_ID_REQUIRED for empty userId', () => {
      expect(() =>
        Notification.create('notif-1', { ...validProps, userId: '' }),
      ).toThrow(
        new DomainException(
          'User ID is required',
          DomainErrorCode.NOTIFICATION_USER_ID_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_USER_ID_TOO_LONG for userId > 50 chars', () => {
      expect(() =>
        Notification.create('notif-1', {
          ...validProps,
          userId: 'a'.repeat(51),
        }),
      ).toThrow(
        new DomainException(
          'User ID cannot exceed 50 characters',
          DomainErrorCode.NOTIFICATION_USER_ID_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_TITLE_REQUIRED for empty title', () => {
      expect(() =>
        Notification.create('notif-1', { ...validProps, title: '' }),
      ).toThrow(
        new DomainException(
          'Title is required',
          DomainErrorCode.NOTIFICATION_TITLE_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_TITLE_TOO_LONG for title > 300 chars', () => {
      expect(() =>
        Notification.create('notif-1', {
          ...validProps,
          title: 'a'.repeat(301),
        }),
      ).toThrow(
        new DomainException(
          'Title cannot exceed 300 characters',
          DomainErrorCode.NOTIFICATION_TITLE_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_CONTENT_REQUIRED for empty content', () => {
      expect(() =>
        Notification.create('notif-1', { ...validProps, content: '' }),
      ).toThrow(
        new DomainException(
          'Content is required',
          DomainErrorCode.NOTIFICATION_CONTENT_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_CONTENT_TOO_LONG for content > 2000 chars', () => {
      expect(() =>
        Notification.create('notif-1', {
          ...validProps,
          content: 'a'.repeat(2001),
        }),
      ).toThrow(
        new DomainException(
          'Content cannot exceed 2000 characters',
          DomainErrorCode.NOTIFICATION_CONTENT_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_ID_REQUIRED for empty id', () => {
      expect(() => Notification.create('', validProps)).toThrow(
        new DomainException(
          'Notification ID is required',
          DomainErrorCode.NOTIFICATION_ID_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_ID_TOO_LONG for id > 50 chars', () => {
      expect(() => Notification.create('a'.repeat(51), validProps)).toThrow(
        new DomainException(
          'Notification ID cannot exceed 50 characters',
          DomainErrorCode.NOTIFICATION_ID_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_TYPE_REQUIRED for null type', () => {
      expect(() =>
        Notification.create('notif-1', { ...validProps, type: null as any }),
      ).toThrow(
        new DomainException(
          'Notification type is required',
          DomainErrorCode.NOTIFICATION_TYPE_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_ACTION_LINK_TOO_LONG for actionLink > 500 chars', () => {
      expect(() =>
        Notification.create('notif-1', {
          ...validProps,
          actionLink: 'a'.repeat(501),
        }),
      ).toThrow(
        new DomainException(
          'Action link cannot exceed 500 characters',
          DomainErrorCode.NOTIFICATION_ACTION_LINK_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_USER_ID_REQUIRED for whitespace-only userId', () => {
      expect(() =>
        Notification.create('notif-1', { ...validProps, userId: '   ' }),
      ).toThrow(
        new DomainException(
          'User ID is required',
          DomainErrorCode.NOTIFICATION_USER_ID_REQUIRED,
        ),
      );
    });
  });

  describe('reconstitute', () => {
    it('should preserve all fields', () => {
      const createdAt = new Date('2026-05-20T10:00:00Z');
      const notification = Notification.reconstitute(
        'notif-1',
        {
          ...validProps,
          isRead: true,
        },
        createdAt,
      );

      expect(notification.id).toBe('notif-1');
      expect(notification.userId).toBe('user-123');
      expect(notification.isRead).toBe(true);
      expect(notification.createdAt).toBe(createdAt);
    });

    it('should NOT emit events', () => {
      const notification = Notification.reconstitute(
        'notif-1',
        validProps,
        new Date(),
      );
      expect(notification.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should set isRead to true', () => {
      const notification = Notification.create('notif-1', validProps);
      expect(notification.isRead).toBe(false);

      notification.markAsRead();
      expect(notification.isRead).toBe(true);
    });

    it('should be idempotent', () => {
      const notification = Notification.create('notif-1', validProps);
      notification.markAsRead();
      notification.markAsRead();
      expect(notification.isRead).toBe(true);
    });
  });
});
