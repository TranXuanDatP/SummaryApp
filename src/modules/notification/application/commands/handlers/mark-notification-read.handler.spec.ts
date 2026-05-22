import { MarkNotificationReadHandler } from './mark-notification-read.handler';
import { MarkNotificationReadCommand } from '../mark-notification-read.command';
import { NotFoundException } from 'src/libs/core/common';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/value-objects/notification-type.value-object';

describe('MarkNotificationReadHandler', () => {
  let handler: MarkNotificationReadHandler;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getById: jest.fn(),
      updateReadStatus: jest.fn(),
    };
    handler = new MarkNotificationReadHandler(mockRepository);
  });

  it('should mark notification as read via domain entity', async () => {
    const notification = Notification.reconstitute(
      'n-1',
      {
        userId: 'user-1',
        type: new NotificationType('daily_work_log_reminder'),
        title: 'Test',
        content: 'Content',
        actionLink: null,
        isRead: false,
      },
      new Date('2026-05-20'),
    );
    mockRepository.getById.mockResolvedValue(notification);
    mockRepository.updateReadStatus.mockResolvedValue(undefined);

    const command = new MarkNotificationReadCommand('n-1', 'user-1');
    const result = await handler.execute(command);

    expect(mockRepository.getById).toHaveBeenCalledWith('n-1');
    expect(mockRepository.updateReadStatus).toHaveBeenCalledWith('n-1', 'user-1');
    expect(result).toEqual({ success: true });
  });

  it('should throw NotFoundException when notification not found', async () => {
    mockRepository.getById.mockResolvedValue(null);

    const command = new MarkNotificationReadCommand('n-999', 'user-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(mockRepository.updateReadStatus).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when notification belongs to different user', async () => {
    const notification = Notification.reconstitute(
      'n-1',
      {
        userId: 'user-2',
        type: new NotificationType('daily_work_log_reminder'),
        title: 'Test',
        content: 'Content',
        actionLink: null,
        isRead: false,
      },
      new Date('2026-05-20'),
    );
    mockRepository.getById.mockResolvedValue(notification);

    const command = new MarkNotificationReadCommand('n-1', 'user-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(mockRepository.updateReadStatus).not.toHaveBeenCalled();
  });
});
