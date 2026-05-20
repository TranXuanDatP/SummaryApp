import { NotificationChannel } from './notification-channel.value-object';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';

describe('NotificationChannel', () => {
  describe('valid channels', () => {
    it('should create with in_app', () => {
      const vo = new NotificationChannel('in_app');
      expect(vo.value).toBe('in_app');
    });

    it('should create with email', () => {
      const vo = new NotificationChannel('email');
      expect(vo.value).toBe('email');
    });
  });

  it('should throw NOTIFICATION_CHANNEL_REQUIRED for empty string', () => {
    expect(() => new NotificationChannel('')).toThrow(
      new DomainException('Notification channel is required', DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED),
    );
  });

  it('should throw NOTIFICATION_CHANNEL_REQUIRED for whitespace', () => {
    expect(() => new NotificationChannel('   ')).toThrow(
      new DomainException('Notification channel is required', DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED),
    );
  });

  it('should throw NOTIFICATION_CHANNEL_INVALID for invalid channel', () => {
    expect(() => new NotificationChannel('sms')).toThrow(
      new DomainException('Invalid notification channel: sms', DomainErrorCode.NOTIFICATION_CHANNEL_INVALID),
    );
  });

  it('should trim whitespace from channel', () => {
    const vo = new NotificationChannel('  in_app  ');
    expect(vo.value).toBe('in_app');
  });

  describe('equality', () => {
    it('should be equal for same channel', () => {
      const a = new NotificationChannel('in_app');
      const b = new NotificationChannel('in_app');
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal for different channels', () => {
      const a = new NotificationChannel('in_app');
      const b = new NotificationChannel('email');
      expect(a.equals(b)).toBe(false);
    });
  });
});
