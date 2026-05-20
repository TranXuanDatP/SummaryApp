import { BaseValueObject, DomainException, DomainErrorCode } from 'src/libs/core/domain';

export class NotificationType extends BaseValueObject {
  private static readonly VALID_TYPES = [
    'daily_work_log_reminder',
    'edit_window_closing',
    'weekly_summary',
    'manager_no_activity_alert',
    'monthly_report_ready',
    'project_no_tasks',
    'comment_received',
    'task_assigned',
  ] as const;

  public readonly value: string;

  constructor(value: string) {
    super();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      throw new DomainException('Notification type is required', DomainErrorCode.NOTIFICATION_TYPE_REQUIRED);
    }
    if (!(NotificationType.VALID_TYPES as readonly string[]).includes(trimmed)) {
      throw new DomainException(
        `Invalid notification type: ${trimmed}`,
        DomainErrorCode.NOTIFICATION_TYPE_INVALID,
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
