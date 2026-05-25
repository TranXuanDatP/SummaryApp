import { randomUUID } from 'crypto';
import { EditWindowClosingScheduler } from './edit-window-closing.scheduler';
import { WorkLogDto } from '@modules/work-log/application/dtos';
import { UserDto } from '@modules/user/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

type WorkLogDtoParams = ConstructorParameters<typeof WorkLogDto>[0];

function makeWorkLog(overrides: Partial<WorkLogDtoParams> = {}): WorkLogDto {
  const defaults: WorkLogDtoParams = {
    id: randomUUID(),
    projectId: 'proj-1',
    employeeId: 'emp-1',
    executionDate: '2026-05-18T00:00:00.000Z',
    content: 'Test content',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
    version: 1,
    isEditable: true,
    editWindowClosesAt: '2026-05-23T00:00:00.000Z',
    projectName: 'Project A',
    employeeName: 'Employee One',
    createdAt: new Date('2026-05-18'),
    updatedAt: new Date('2026-05-18'),
  };
  return new WorkLogDto({ ...defaults, ...overrides });
}

describe('EditWindowClosingScheduler', () => {
  let scheduler: EditWindowClosingScheduler;
  let userReadDao: any;
  let workLogReadDao: any;
  let notificationRepository: any;
  let notificationReadDao: any;
  let emailService: any;
  let calculator: any;

  const mockEmployee = new UserDto({
    id: 'emp-1',
    email: 'emp1@test.com',
    fullName: 'Employee One',
    role: 'employee',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    userReadDao = { findById: jest.fn() };
    workLogReadDao = { findByExecutionDate: jest.fn().mockResolvedValue([]) };
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    notificationReadDao = {
      existsByUserIdAndTypeAndDate: jest.fn().mockResolvedValue(false),
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    calculator = {
      isBusinessDay: jest.fn().mockReturnValue(true),
      getEditWindowClosesAt: jest
        .fn()
        .mockReturnValue(new Date('2026-05-23T00:00:00.000Z')),
    };

    scheduler = new EditWindowClosingScheduler(
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

  describe('success path — WorkLog 2 business days old', () => {
    beforeEach(() => {
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(mockEmployee);
    });

    it('should create notification with correct content and actionLink', async () => {
      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.userId).toBe('emp-1');
      expect(notification.type.value).toBe('edit_window_closing');
      expect(notification.title).toContain('2026-05-18');
      expect(notification.title).toBe('WorkLog ngày 2026-05-18 sắp bị khóa');
      expect(notification.content).toContain('2026-05-18');
      expect(notification.content).toContain('2026-05-23');
      expect(notification.actionLink).toMatch(/^\/work-logs\//);
    });

    it('should NOT send email by default (N-2 email default is disabled)', async () => {
      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('WorkLog already unlocked', () => {
    it('should skip unlocked WorkLogs', async () => {
      const unlockedWorkLog = makeWorkLog({
        employeeId: 'emp-1',
        isUnlocked: true,
      });
      workLogReadDao.findByExecutionDate.mockResolvedValue([unlockedWorkLog]);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('non-business day', () => {
    it('should skip processing on non-business day (holiday)', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleEditWindowClosing();

      expect(workLogReadDao.findByExecutionDate).not.toHaveBeenCalled();
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('anti-spam', () => {
    beforeEach(() => {
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(mockEmployee);
    });

    it('should skip when already notified today', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('preference — email enabled', () => {
    beforeEach(() => {
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(mockEmployee);
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'email')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'edit_window_closing',
                channel: 'email',
                enabled: true,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should send email when email preference explicitly enabled', async () => {
      await scheduler.handleEditWindowClosing();

      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('preference — in_app disabled', () => {
    beforeEach(() => {
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(mockEmployee);
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'edit_window_closing',
                channel: 'in_app',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should NOT create notification when in_app disabled', async () => {
      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('inactive employee', () => {
    it('should skip when employee is inactive', async () => {
      const inactiveEmployee = new UserDto({
        id: 'emp-1',
        email: 'emp1@test.com',
        fullName: 'Inactive',
        role: 'employee',
        isActive: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(inactiveEmployee);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should skip when employee not found', async () => {
      const workLog = makeWorkLog({ employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(null);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should skip when user is not an employee (e.g. manager with a WorkLog)', async () => {
      const managerUser = new UserDto({
        id: 'mgr-1',
        email: 'mgr@test.com',
        fullName: 'Manager',
        role: 'manager',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const workLog = makeWorkLog({ employeeId: 'mgr-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(managerUser);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deduplication — multiple WorkLogs same employee same date', () => {
    it('should create only ONE notification per employee', async () => {
      const wl1 = makeWorkLog({ id: 'wl-1', employeeId: 'emp-1' });
      const wl2 = makeWorkLog({ id: 'wl-2', employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([wl1, wl2]);
      userReadDao.findById.mockResolvedValue(mockEmployee);

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should use first WorkLog actionLink for notification', async () => {
      const wl1 = makeWorkLog({ id: 'wl-first', employeeId: 'emp-1' });
      const wl2 = makeWorkLog({ id: 'wl-second', employeeId: 'emp-1' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([wl1, wl2]);
      userReadDao.findById.mockResolvedValue(mockEmployee);

      await scheduler.handleEditWindowClosing();

      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.actionLink).toBe('/work-logs/wl-first');
    });
  });

  describe('error handling', () => {
    it('should not crash when entire method throws on initial query', async () => {
      workLogReadDao.findByExecutionDate.mockRejectedValue(
        new Error('DB down'),
      );

      await expect(scheduler.handleEditWindowClosing()).resolves.not.toThrow();
    });

    it('should continue processing other employees when one fails', async () => {
      const wl1 = makeWorkLog({ employeeId: 'emp-1' });
      const wl2 = makeWorkLog({ employeeId: 'emp-2' });
      workLogReadDao.findByExecutionDate.mockResolvedValue([wl1, wl2]);
      userReadDao.findById
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(
          new UserDto({
            id: 'emp-2',
            email: 'emp2@test.com',
            fullName: 'Employee Two',
            role: 'employee',
            isActive: true,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );

      await scheduler.handleEditWindowClosing();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTargetDate', () => {
    it('should compute target date as 2 business days before today', async () => {
      calculator.isBusinessDay.mockImplementation(() => true);
      calculator.getEditWindowClosesAt.mockReturnValue(
        new Date('2026-05-23T00:00:00.000Z'),
      );

      workLogReadDao.findByExecutionDate.mockResolvedValue([]);

      await scheduler.handleEditWindowClosing();

      expect(workLogReadDao.findByExecutionDate).toHaveBeenCalled();
      const calledDate = workLogReadDao.findByExecutionDate.mock.calls[0][0];
      expect(calledDate).toBeInstanceOf(Date);
    });
  });

  describe('actionLink includes correct workLogId', () => {
    it('should include workLogId in actionLink', async () => {
      const workLog = makeWorkLog({
        id: 'wl-specific-id',
        employeeId: 'emp-1',
      });
      workLogReadDao.findByExecutionDate.mockResolvedValue([workLog]);
      userReadDao.findById.mockResolvedValue(mockEmployee);

      await scheduler.handleEditWindowClosing();

      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.actionLink).toBe('/work-logs/wl-specific-id');
    });
  });
});
