import { NotificationController } from './notification.controller';
import {
  MarkNotificationReadCommand,
  MarkAllReadCommand,
  UpdateNotificationPreferenceCommand,
} from '../../application/commands';
import {
  GetNotificationsQuery,
  GetNotificationPreferencesQuery,
} from '../../application/queries';
import { NotificationDto } from '../../application/dtos/notification.dto';
import { NotificationPreferenceDto } from '../../application/dtos/notification-preference.dto';

function makeNotificationDto(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return new NotificationDto({
    id: 'n-1',
    type: 'daily_work_log_reminder',
    title: 'Test notification',
    content: 'Test content',
    actionLink: null,
    isRead: false,
    createdAt: new Date('2026-05-20'),
    ...overrides,
  });
}

function makePreferenceDto(overrides: Partial<NotificationPreferenceDto> = {}): NotificationPreferenceDto {
  return new NotificationPreferenceDto({
    id: 'p-1',
    type: 'daily_work_log_reminder',
    channel: 'in_app',
    enabled: true,
    ...overrides,
  });
}

describe('NotificationController', () => {
  let controller: NotificationController;
  let commandBus: any;
  let queryBus: any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    controller = new NotificationController(commandBus, queryBus);
  });

  describe('GET /notifications', () => {
    it('should dispatch GetNotificationsQuery with userId and pagination', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      const notifications = [makeNotificationDto()];
      queryBus.execute.mockResolvedValue({ data: notifications, total: 1, page: 1, totalPages: 1 });

      const result = await controller.getList(user);

      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      const query = queryBus.execute.mock.calls[0][0];
      expect(query).toBeInstanceOf(GetNotificationsQuery);
      expect(query.userId).toBe('user-1');
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass custom pagination params', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      queryBus.execute.mockResolvedValue({ data: [], total: 0, page: 2, totalPages: 0 });

      await controller.getList(user, '2', '50');

      const query = queryBus.execute.mock.calls[0][0];
      expect(query.page).toBe(2);
      expect(query.limit).toBe(50);
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should dispatch MarkNotificationReadCommand', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      commandBus.execute.mockResolvedValue({ success: true });

      const result = await controller.markRead('n-1', user);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(MarkNotificationReadCommand);
      expect(command.notificationId).toBe('n-1');
      expect(command.userId).toBe('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('PUT /notifications/read-all', () => {
    it('should dispatch MarkAllReadCommand', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      commandBus.execute.mockResolvedValue({ success: true });

      const result = await controller.markAllRead(user);

      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(MarkAllReadCommand);
      expect(command.userId).toBe('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('GET /notifications/preferences', () => {
    it('should dispatch GetNotificationPreferencesQuery', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      const prefs = [makePreferenceDto()];
      queryBus.execute.mockResolvedValue(prefs);

      const result = await controller.getPreferences(user);

      const query = queryBus.execute.mock.calls[0][0];
      expect(query).toBeInstanceOf(GetNotificationPreferencesQuery);
      expect(query.userId).toBe('user-1');
      expect(result).toEqual(prefs);
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should dispatch UpdateNotificationPreferenceCommand and return updated preferences', async () => {
      const user = { userId: 'user-1', role: 'employee' };
      const dto = {
        preferences: [
          { type: 'daily_work_log_reminder', channel: 'email', enabled: false },
        ],
      };
      const updatedPrefs = [makePreferenceDto({ channel: 'email', enabled: false })];
      commandBus.execute.mockResolvedValue(undefined);
      queryBus.execute.mockResolvedValue(updatedPrefs);

      const result = await controller.updatePreferences(dto, user);

      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(UpdateNotificationPreferenceCommand);
      expect(command.userId).toBe('user-1');
      expect(command.preferences).toHaveLength(1);
      expect(command.preferences[0].type).toBe('daily_work_log_reminder');
      expect(command.preferences[0].channel).toBe('email');
      expect(command.preferences[0].enabled).toBe(false);

      expect(queryBus.execute).toHaveBeenCalledTimes(1);
      const query = queryBus.execute.mock.calls[0][0];
      expect(query).toBeInstanceOf(GetNotificationPreferencesQuery);
      expect(result).toEqual(updatedPrefs);
    });
  });
});
