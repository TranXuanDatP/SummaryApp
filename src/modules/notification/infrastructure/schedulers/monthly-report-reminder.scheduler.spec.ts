import { randomUUID } from 'crypto';
import { MonthlyReportReminderScheduler } from './monthly-report-reminder.scheduler';
import { UserDto } from '@modules/user/application/dtos';
import { ProjectDto } from '@modules/project/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

describe('MonthlyReportReminderScheduler', () => {
  let scheduler: MonthlyReportReminderScheduler;
  let userReadDao: any;
  let projectReadDao: any;
  let notificationRepository: any;
  let notificationReadDao: any;
  let emailService: any;
  let calculator: any;

  const mockManager = new UserDto({
    id: 'mgr-1', email: 'mgr@test.com', fullName: 'Manager One',
    role: 'manager', isActive: true, version: 1,
    createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    userReadDao = { findAllActiveByRole: jest.fn().mockResolvedValue([mockManager]) };
    projectReadDao = { findProjectsWithNoWorkLogsOlderThan: jest.fn().mockResolvedValue([]) };
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    notificationReadDao = {
      existsByUserIdAndTypeAndDate: jest.fn().mockResolvedValue(false),
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };
    calculator = { isBusinessDay: jest.fn().mockReturnValue(true) };

    scheduler = new MonthlyReportReminderScheduler(
      userReadDao, projectReadDao, notificationRepository,
      notificationReadDao, emailService, calculator,
    );
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  // N-5 tests
  describe('N-5: monthly report reminder', () => {
    it('should notify and email managers on first business day of month', async () => {
      // Mock the private method via prototype to force first biz day of month
      const spy = jest.spyOn(scheduler as any, 'isFirstBusinessDayOfMonth').mockReturnValue(true);

      await scheduler.handleMonthlyReportReminder();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.type.value).toBe('monthly_report_ready');
      expect(notification.actionLink).toBe('/reports/monthly');

      spy.mockRestore();
    });

    it('should NOT fire when not first business day of month', async () => {
      const spy = jest.spyOn(scheduler as any, 'isFirstBusinessDayOfMonth').mockReturnValue(false);

      await scheduler.handleMonthlyReportReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should skip on non-business day', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleMonthlyReportReminder();

      expect(userReadDao.findAllActiveByRole).not.toHaveBeenCalled();
    });

    it('should skip when anti-spam already triggered', async () => {
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleMonthlyReportReminder();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  // N-6 tests
  describe('N-6: project no tasks', () => {
    const mockProject = new ProjectDto({
      id: 'proj-1', name: 'Empty Project', description: '', status: 'active',
      version: 1, createdAt: new Date('2026-05-01'), updatedAt: new Date('2026-05-01'),
    });

    it('should notify managers about project with no WorkLogs', async () => {
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([mockProject]);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.type.value).toBe('project_no_tasks');
      expect(notification.title).toContain('Empty Project');
      expect(notification.actionLink).toBe('/projects/proj-1');
    });

    it('should NOT notify when no empty projects found', async () => {
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([]);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should skip on non-business day', async () => {
      calculator.isBusinessDay.mockReturnValue(false);

      await scheduler.handleProjectNoTasks();

      expect(projectReadDao.findProjectsWithNoWorkLogsOlderThan).not.toHaveBeenCalled();
    });

    it('should skip when anti-spam already triggered', async () => {
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([mockProject]);
      notificationReadDao.existsByUserIdAndTypeAndDate.mockResolvedValue(true);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should notify multiple managers about same project', async () => {
      const mgr2 = new UserDto({
        id: 'mgr-2', email: 'mgr2@test.com', fullName: 'M2',
        role: 'manager', isActive: true, version: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockResolvedValue([mockManager, mgr2]);
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([mockProject]);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should list ALL projects in one notification per manager', async () => {
      const project2 = new ProjectDto({
        id: 'proj-2', name: 'Another Empty', description: '', status: 'active',
        version: 1, createdAt: new Date('2026-05-01'), updatedAt: new Date('2026-05-01'),
      });
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([mockProject, project2]);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.title).toContain('2 dự án');
      expect(notification.title).toContain('Empty Project');
      expect(notification.title).toContain('Another Empty');
      expect(notification.actionLink).toBe('/projects');
    });

    it('should not notify non-manager users', async () => {
      const nonManager = new UserDto({
        id: 'emp-1', email: 'emp@test.com', fullName: 'Emp',
        role: 'employee', isActive: true, version: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      userReadDao.findAllActiveByRole.mockResolvedValue([nonManager]);
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockResolvedValue([mockProject]);

      await scheduler.handleProjectNoTasks();

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not crash N-5 on DB failure', async () => {
      userReadDao.findAllActiveByRole.mockRejectedValue(new Error('DB down'));

      await expect(scheduler.handleMonthlyReportReminder()).resolves.not.toThrow();
    });

    it('should not crash N-6 on DB failure', async () => {
      projectReadDao.findProjectsWithNoWorkLogsOlderThan.mockRejectedValue(new Error('DB down'));

      await expect(scheduler.handleProjectNoTasks()).resolves.not.toThrow();
    });
  });
});
