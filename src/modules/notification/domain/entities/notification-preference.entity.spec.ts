import {
  NotificationPreference,
  NotificationPreferenceProps,
} from './notification-preference.entity';
import { NotificationType } from '../value-objects';
import { NotificationChannel } from '../value-objects';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';

describe('NotificationPreference', () => {
  const validProps: NotificationPreferenceProps = {
    userId: 'user-123',
    type: new NotificationType('comment_received'),
    channel: new NotificationChannel('in_app'),
    enabled: true,
  };

  describe('create', () => {
    it('should create preference with valid props', () => {
      const pref = NotificationPreference.create('pref-1', validProps);

      expect(pref.id).toBe('pref-1');
      expect(pref.userId).toBe('user-123');
      expect(pref.type.value).toBe('comment_received');
      expect(pref.channel.value).toBe('in_app');
      expect(pref.enabled).toBe(true);
    });

    it('should not emit events on create', () => {
      const pref = NotificationPreference.create('pref-1', validProps);
      expect(pref.getDomainEvents()).toHaveLength(0);
    });

    it('should trim userId', () => {
      const pref = NotificationPreference.create('pref-1', {
        ...validProps,
        userId: '  user-123  ',
      });
      expect(pref.userId).toBe('user-123');
    });

    it('should throw NOTIFICATION_PREF_USER_ID_REQUIRED for empty userId', () => {
      expect(() =>
        NotificationPreference.create('pref-1', { ...validProps, userId: '' }),
      ).toThrow(
        new DomainException(
          'User ID is required',
          DomainErrorCode.NOTIFICATION_PREF_USER_ID_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_PREF_ID_REQUIRED for empty id', () => {
      expect(() => NotificationPreference.create('', validProps)).toThrow(
        new DomainException(
          'Notification preference ID is required',
          DomainErrorCode.NOTIFICATION_PREF_ID_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_PREF_ID_TOO_LONG for id > 50 chars', () => {
      expect(() =>
        NotificationPreference.create('a'.repeat(51), validProps),
      ).toThrow(
        new DomainException(
          'Notification preference ID cannot exceed 50 characters',
          DomainErrorCode.NOTIFICATION_PREF_ID_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_TYPE_REQUIRED for null type', () => {
      expect(() =>
        NotificationPreference.create('pref-1', {
          ...validProps,
          type: null as any,
        }),
      ).toThrow(
        new DomainException(
          'Notification type is required',
          DomainErrorCode.NOTIFICATION_TYPE_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_CHANNEL_REQUIRED for null channel', () => {
      expect(() =>
        NotificationPreference.create('pref-1', {
          ...validProps,
          channel: null as any,
        }),
      ).toThrow(
        new DomainException(
          'Notification channel is required',
          DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED,
        ),
      );
    });

    it('should throw NOTIFICATION_PREF_USER_ID_TOO_LONG for userId > 50 chars', () => {
      expect(() =>
        NotificationPreference.create('pref-1', {
          ...validProps,
          userId: 'a'.repeat(51),
        }),
      ).toThrow(
        new DomainException(
          'User ID cannot exceed 50 characters',
          DomainErrorCode.NOTIFICATION_PREF_USER_ID_TOO_LONG,
        ),
      );
    });

    it('should throw NOTIFICATION_PREF_USER_ID_REQUIRED for whitespace userId', () => {
      expect(() =>
        NotificationPreference.create('pref-1', {
          ...validProps,
          userId: '   ',
        }),
      ).toThrow(
        new DomainException(
          'User ID is required',
          DomainErrorCode.NOTIFICATION_PREF_USER_ID_REQUIRED,
        ),
      );
    });
  });

  describe('reconstitute', () => {
    it('should preserve all fields', () => {
      const createdAt = new Date('2026-05-20T10:00:00Z');
      const updatedAt = new Date('2026-05-20T12:00:00Z');
      const pref = NotificationPreference.reconstitute(
        'pref-1',
        {
          ...validProps,
          enabled: false,
        },
        createdAt,
        updatedAt,
      );

      expect(pref.id).toBe('pref-1');
      expect(pref.userId).toBe('user-123');
      expect(pref.enabled).toBe(false);
      expect(pref.createdAt).toBe(createdAt);
      expect(pref.updatedAt).toBe(updatedAt);
    });

    it('should NOT emit events', () => {
      const pref = NotificationPreference.reconstitute(
        'pref-1',
        validProps,
        new Date(),
        new Date(),
      );
      expect(pref.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('updateEnabled', () => {
    it('should set enabled to true', () => {
      const pref = NotificationPreference.create('pref-1', {
        ...validProps,
        enabled: false,
      });
      expect(pref.enabled).toBe(false);

      pref.updateEnabled(true);
      expect(pref.enabled).toBe(true);
    });

    it('should set enabled to false', () => {
      const pref = NotificationPreference.create('pref-1', validProps);
      expect(pref.enabled).toBe(true);

      pref.updateEnabled(false);
      expect(pref.enabled).toBe(false);
    });
  });
});
