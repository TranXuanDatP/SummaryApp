import { NotificationType } from './notification-type.value-object';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';

describe('NotificationType', () => {
  const validTypes = [
    'daily_work_log_reminder',
    'edit_window_closing',
    'weekly_summary',
    'manager_no_activity_alert',
    'monthly_report_ready',
    'project_no_tasks',
    'comment_received',
    'task_assigned',
  ];

  describe('valid types', () => {
    it.each(validTypes)('should create with valid type "%s"', (type) => {
      const vo = new NotificationType(type);
      expect(vo.value).toBe(type);
    });
  });

  it('should throw NOTIFICATION_TYPE_REQUIRED for empty string', () => {
    expect(() => new NotificationType('')).toThrow(
      new DomainException('Notification type is required', DomainErrorCode.NOTIFICATION_TYPE_REQUIRED),
    );
  });

  it('should throw NOTIFICATION_TYPE_REQUIRED for whitespace', () => {
    expect(() => new NotificationType('   ')).toThrow(
      new DomainException('Notification type is required', DomainErrorCode.NOTIFICATION_TYPE_REQUIRED),
    );
  });

  it('should throw NOTIFICATION_TYPE_INVALID for invalid type', () => {
    expect(() => new NotificationType('invalid_type')).toThrow(
      new DomainException('Invalid notification type: invalid_type', DomainErrorCode.NOTIFICATION_TYPE_INVALID),
    );
  });

  it('should trim whitespace from type', () => {
    const vo = new NotificationType('  comment_received  ');
    expect(vo.value).toBe('comment_received');
  });

  describe('equality', () => {
    it('should be equal for same type', () => {
      const a = new NotificationType('comment_received');
      const b = new NotificationType('comment_received');
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal for different types', () => {
      const a = new NotificationType('comment_received');
      const b = new NotificationType('task_assigned');
      expect(a.equals(b)).toBe(false);
    });
  });
});
