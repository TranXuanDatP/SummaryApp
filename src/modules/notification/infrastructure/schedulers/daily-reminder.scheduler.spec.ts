import { randomUUID } from 'crypto';
import { DailyReminderScheduler } from './daily-reminder.scheduler';
import { UserDto } from '@modules/user/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

describe('DailyReminderScheduler', () => {
  let scheduler: DailyReminderScheduler;
  let userReadDao: any;
  let workLogReadDao: any;
  let notificationRepository: any;
  let notificationReadDao: any;
  let emailService: any;
  let calculator: any;

  const mockEmployee1 = new UserDto({
    id: 'emp-1',
    email: 'emp1@test.com',
    fullName: 'Employee One',
    role: 'employee',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockEmployee2 = new UserDto({
    id: 'emp-2',
    email: 'emp2@test.com',
    fullName: 'Employee Two',
    role: 'employee',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    userReadDao = { findAllActiveByRole: jest.fn() };
    workLogReadDao = { findAll: jest.fn() };
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    notificationReadDao = {
      existsByUserIdAndTypeAndDate: jest.fn().mockResolvedValue(false),
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    calculator = { isBusinessDay: jest.fn().mockReturnValue(true) };

    scheduler = new DailyReminderScheduler(
      userReadDao,
      workLogReadDao,
      notificationRepository,
      notificationReadDao,
      emailService,
      calculator,
    );
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('success path — employee with no WorkLog today', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
    });

    it('should create notification and send email with correct content', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.userId).toBe('emp-1');
      expect(notification.type.value).toBe('daily_work_log_reminder');
      expect(notification.title).toBe('Bạn chưa ghi nhận công việc hôm nay');
      expect(notification.content).toBe('Chỉ mất 2 phút! Hãy ghi nhận công việc ngày hôm nay.');
      expect(notification.actionLink).toBe('/work-logs');

      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledWith(
        'emp1@test.com',
        'Bạn chưa ghi nhận công việc hôm nay',
        'Chỉ mất 2 phút! Hãy ghi nhận công việc ngày hôm nay.',
      );
    });
  });

  describe('employee has WorkLog today', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [{}], total: 1 });
    });

    it('should NOT create notification when employee already has WorkLog', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('non-business day', () => {
    it('should skip processing on non-business day (holiday)', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleDailyReminder();

      expect(userReadDao.findAllActiveByRole).not.toHaveBeenCalled();
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('anti-spam', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
    });

    it('should skip when already notified today', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('preference — email disabled', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'email')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'daily_work_log_reminder',
                channel: 'email',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should create notification but NOT send email', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('preference — in_app disabled', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'daily_work_log_reminder',
                channel: 'in_app',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should NOT create notification when in_app disabled', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should still send email when in_app disabled but email default enabled', async () => {
      await scheduler.handleDailyReminder();

      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('preference — both disabled', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) =>
          Promise.resolve(
            new NotificationPreferenceDto({
              id: randomUUID(),
              type: 'daily_work_log_reminder',
              channel,
              enabled: false,
            }),
          ),
      );
    });

    it('should NOT create notification and NOT send email when both disabled', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('inactive employees', () => {
    it('should NOT include inactive employees in the query result (DAO handles this)', async () => {
      const inactiveEmployee = new UserDto({
        id: 'emp-inactive',
        email: 'inactive@test.com',
        fullName: 'Inactive',
        role: 'employee',
        isActive: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1]);

      await scheduler.handleDailyReminder();

      expect(userReadDao.findAllActiveByRole).toHaveBeenCalledWith('employee');
    });
  });

  describe('multiple employees', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1, mockEmployee2]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
    });

    it('should process multiple employees correctly', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
      expect(emailService.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee1, mockEmployee2]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
    });

    it('should continue processing other employees when one fails', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(false);

      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should not crash when entire method throws on initial query', async () => {
      userReadDao.findAllActiveByRole.mockRejectedValue(new Error('DB down'));

      await expect(scheduler.handleDailyReminder()).resolves.not.toThrow();
    });
  });

  describe('email validation', () => {
    beforeEach(() => {
      const noEmailEmployee = new UserDto({
        id: 'emp-noemail',
        email: '',
        fullName: 'No Email',
        role: 'employee',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockResolvedValue([noEmailEmployee]);
      workLogReadDao.findAll.mockResolvedValue({ data: [], total: 0 });
    });

    it('should skip email when employee has no email address', async () => {
      await scheduler.handleDailyReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });
});
