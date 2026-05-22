import { randomUUID } from 'crypto';
import { ManagerAlertScheduler } from './manager-alert.scheduler';
import { UserDto } from '@modules/user/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

describe('ManagerAlertScheduler', () => {
  let scheduler: ManagerAlertScheduler;
  let userReadDao: any;
  let workLogReadDao: any;
  let notificationRepository: any;
  let notificationReadDao: any;
  let calculator: any;

  const mockEmployee = new UserDto({
    id: 'emp-1', email: 'emp@test.com', fullName: 'Employee One',
    role: 'employee', isActive: true, version: 1,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const mockManager = new UserDto({
    id: 'mgr-1', email: 'mgr@test.com', fullName: 'Manager One',
    role: 'manager', isActive: true, version: 1,
    createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    userReadDao = {
      findAllActiveByRole: jest.fn()
        .mockImplementation((role: string) => {
          if (role === 'employee') return Promise.resolve([mockEmployee]);
          if (role === 'manager') return Promise.resolve([mockManager]);
          return Promise.resolve([]);
        }),
    };
    workLogReadDao = { findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    notificationReadDao = {
      existsByUserIdAndTypeAndDate: jest.fn().mockResolvedValue(false),
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    calculator = { isBusinessDay: jest.fn().mockReturnValue(true) };

    scheduler = new ManagerAlertScheduler(
      userReadDao, workLogReadDao, notificationRepository,
      notificationReadDao, calculator,
    );
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('success: employee inactive for 2 biz days', () => {
    it('should notify manager', async () => {
      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.userId).toBe('mgr-1');
      expect(notification.type.value).toBe('manager_no_activity_alert');
      expect(notification.title).toContain('Employee One');
    });
  });

  describe('employee has WorkLog on one of 2 days', () => {
    it('should NOT notify when employee has WorkLog on last biz day', async () => {
      workLogReadDao.findAll
        .mockResolvedValueOnce({ data: [{}], total: 1 });

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('non-business day', () => {
    it('should skip', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleManagerAlert();

      expect(userReadDao.findAllActiveByRole).not.toHaveBeenCalled();
    });
  });

  describe('anti-spam', () => {
    it('should skip when manager already notified today', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('in_app disabled', () => {
    it('should always create notification (anti-spam sentinel) when in_app disabled', async () => {
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(new NotificationPreferenceDto({
              id: randomUUID(), type: 'manager_no_activity_alert', channel: 'in_app', enabled: false,
            }));
          return Promise.resolve(null);
        },
      );

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple managers', () => {
    it('should notify all managers', async () => {
      const mgr2 = new UserDto({
        id: 'mgr-2', email: 'mgr2@test.com', fullName: 'M2',
        role: 'manager', isActive: true, version: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockImplementation((role: string) => {
        if (role === 'employee') return Promise.resolve([mockEmployee]);
        if (role === 'manager') return Promise.resolve([mockManager, mgr2]);
        return Promise.resolve([]);
      });

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple inactive employees', () => {
    it('should list ALL inactive employee names in one notification', async () => {
      const emp2 = new UserDto({
        id: 'emp-2', email: 'emp2@test.com', fullName: 'Employee Two',
        role: 'employee', isActive: true, version: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockImplementation((role: string) => {
        if (role === 'employee') return Promise.resolve([mockEmployee, emp2]);
        if (role === 'manager') return Promise.resolve([mockManager]);
        return Promise.resolve([]);
      });

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.title).toContain('2 nhân viên');
      expect(notification.title).toContain('Employee One');
      expect(notification.title).toContain('Employee Two');
    });
  });

  describe('error handling', () => {
    it('should not crash on DB failure', async () => {
      userReadDao.findAllActiveByRole.mockRejectedValue(new Error('DB down'));

      await expect(scheduler.handleManagerAlert()).resolves.not.toThrow();
    });

    it('should continue when one employee check fails', async () => {
      const emp2 = new UserDto({
        id: 'emp-2', email: 'emp2@test.com', fullName: 'E2',
        role: 'employee', isActive: true, version: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockImplementation((role: string) => {
        if (role === 'employee') return Promise.resolve([mockEmployee, emp2]);
        if (role === 'manager') return Promise.resolve([mockManager]);
        return Promise.resolve([]);
      });
      workLogReadDao.findAll
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue({ data: [], total: 0 });

      await scheduler.handleManagerAlert();

      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });
});
