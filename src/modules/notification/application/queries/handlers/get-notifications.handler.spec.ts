import { GetNotificationsHandler } from './get-notifications.handler';
import { GetNotificationsQuery } from '../get-notifications.query';
import { NotificationDto } from '../../dtos/notification.dto';

function makeNotificationDto(
  overrides: Partial<NotificationDto> = {},
): NotificationDto {
  return new NotificationDto({
    id: 'n-1',
    type: 'daily_work_log_reminder',
    title: 'Test notification',
    content: 'Content',
    actionLink: null,
    isRead: false,
    createdAt: new Date('2026-05-20'),
    ...overrides,
  });
}

describe('GetNotificationsHandler', () => {
  let handler: GetNotificationsHandler;
  let mockReadDao: any;

  beforeEach(() => {
    mockReadDao = {
      findByUserId: jest.fn(),
    };
    handler = new GetNotificationsHandler(mockReadDao);
  });

  it('should return paginated results for user', async () => {
    const notifications = [
      makeNotificationDto(),
      makeNotificationDto({ id: 'n-2' }),
    ];
    mockReadDao.findByUserId.mockResolvedValue({
      data: notifications,
      total: 2,
    });

    const query = new GetNotificationsQuery('user-1', 1, 20);
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(mockReadDao.findByUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      page: 1,
      limit: 20,
    });
  });

  it('should only return notifications for the requesting user', async () => {
    mockReadDao.findByUserId.mockResolvedValue({ data: [], total: 0 });

    const query = new GetNotificationsQuery('user-1', 1, 20);
    await handler.execute(query);

    expect(mockReadDao.findByUserId).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('should return empty results with correct pagination', async () => {
    mockReadDao.findByUserId.mockResolvedValue({ data: [], total: 0 });

    const query = new GetNotificationsQuery('user-1', 1, 20);
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly', async () => {
    mockReadDao.findByUserId.mockResolvedValue({
      data: [makeNotificationDto()],
      total: 45,
    });

    const query = new GetNotificationsQuery('user-1', 2, 20);
    const result = await handler.execute(query);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });
});
