import { randomUUID } from 'crypto';
import { WeeklySummaryScheduler } from './weekly-summary.scheduler';
import { UserDto } from '@modules/user/application/dtos';
import { WorkLogDto } from '@modules/work-log/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

type WorkLogDtoParams = ConstructorParameters<typeof WorkLogDto>[0];

function makeWorkLog(overrides: Partial<WorkLogDtoParams> = {}): WorkLogDto {
  const defaults: WorkLogDtoParams = {
    id: randomUUID(),
    projectId: 'proj-1',
    employeeId: 'emp-1',
    executionDate: '2026-05-18T00:00:00.000Z',
    content: 'Test',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
      status: 'in_progress',
    version: 1,
    isEditable: true,
    editWindowClosesAt: '2026-05-23T00:00:00.000Z',
    projectName: 'P1',
    employeeName: 'Emp',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return new WorkLogDto({ ...defaults, ...overrides });
}

describe('WeeklySummaryScheduler', () => {
  let scheduler: WeeklySummaryScheduler;
  let userReadDao: any;
  let workLogReadDao: any;
  let commentReadDao: any;
  let notificationRepository: any;
  let notificationReadDao: any;
  let emailService: any;
  let calculator: any;

  const mockEmployee = new UserDto({
    id: 'emp-1',
    email: 'emp@test.com',
    fullName: 'Employee One',
    role: 'employee',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    userReadDao = { findAllActiveByRole: jest.fn() };
    workLogReadDao = {
      findByEmployeeAndMonth: jest.fn().mockResolvedValue([]),
    };
    commentReadDao = { countByWorkLogIds: jest.fn().mockResolvedValue(0) };
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    notificationReadDao = {
      existsByUserIdAndTypeAndDate: jest.fn().mockResolvedValue(false),
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    calculator = {
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: jest.fn().mockReturnValue(4),
    };

    scheduler = new WeeklySummaryScheduler(
      userReadDao,
      workLogReadDao,
      commentReadDao,
      notificationRepository,
      notificationReadDao,
      emailService,
      calculator,
    );
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('success path', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);
    });

    it('should create notification and send email with weekly stats', async () => {
      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
      const body = emailService.send.mock.calls[0][2];
      expect(body).toContain('0/5');
    });

    it('should count WorkLogs and comments correctly', async () => {
      // Set today to Friday May 22 so Monday=May18, both work logs fall within the week
      jest.useFakeTimers({ now: new Date(2026, 4, 22) });

      const wls = [
        makeWorkLog({ id: 'wl-1', executionDate: '2026-05-18T00:00:00.000Z' }),
        makeWorkLog({ id: 'wl-2', executionDate: '2026-05-19T00:00:00.000Z' }),
      ];
      workLogReadDao.findByEmployeeAndMonth.mockResolvedValue(wls);
      commentReadDao.countByWorkLogIds.mockResolvedValue(3);

      await scheduler.handleWeeklySummary();

      expect(commentReadDao.countByWorkLogIds).toHaveBeenCalledWith([
        'wl-1',
        'wl-2',
      ]);

      jest.useRealTimers();
    });
  });

  describe('non-business day', () => {
    it('should skip on holiday Friday', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleWeeklySummary();

      expect(userReadDao.findAllActiveByRole).not.toHaveBeenCalled();
    });
  });

  describe('anti-spam', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);
    });

    it('should skip when already notified today', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('email preference disabled', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'email')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'weekly_summary',
                channel: 'email',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should create notification but not send email', async () => {
      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('in_app disabled', () => {
    beforeEach(() => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'weekly_summary',
                channel: 'in_app',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );
    });

    it('should always create notification (anti-spam sentinel) but still send email', async () => {
      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('cross-month boundary', () => {
    it('should fetch previous month WorkLogs when Monday is in different month', async () => {
      // Simulate a week where Monday is in March, today (Friday) is in April
      const realDate = new Date(2026, 3, 3); // April 3, 2026 (Friday)
      jest.useFakeTimers({ now: realDate });

      const marchWorkLog = makeWorkLog({
        id: 'wl-mar',
        executionDate: '2026-03-30T00:00:00.000Z',
      });
      const aprilWorkLog = makeWorkLog({
        id: 'wl-apr',
        executionDate: '2026-04-02T00:00:00.000Z',
      });

      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);
      workLogReadDao.findByEmployeeAndMonth
        .mockResolvedValueOnce([aprilWorkLog]) // April (current month)
        .mockResolvedValueOnce([marchWorkLog]); // March (previous month, Monday's month)

      await scheduler.handleWeeklySummary();

      // Should have called findByEmployeeAndMonth twice: once for April, once for March
      expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledTimes(2);
      expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledWith(
        'emp-1',
        4,
        2026,
      );
      expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledWith(
        'emp-1',
        3,
        2026,
      );

      jest.useRealTimers();
    });

    it('should NOT fetch previous month when Monday and today are same month', async () => {
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee]);

      await scheduler.handleWeeklySummary();

      expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should not crash on DB failure', async () => {
      userReadDao.findAllActiveByRole.mockRejectedValue(new Error('DB down'));

      await expect(scheduler.handleWeeklySummary()).resolves.not.toThrow();
    });

    it('should continue processing other employees when one fails', async () => {
      const emp2 = new UserDto({
        id: 'emp-2',
        email: 'emp2@test.com',
        fullName: 'E2',
        role: 'employee',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockResolvedValue([mockEmployee, emp2]);
      workLogReadDao.findByEmployeeAndMonth
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce([]);

      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('email validation', () => {
    it('should skip email when employee has no email', async () => {
      const noEmailEmp = new UserDto({
        id: 'emp-noemail',
        email: '',
        fullName: 'No Email',
        role: 'employee',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockResolvedValue([noEmailEmp]);

      await scheduler.handleWeeklySummary();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });
});
