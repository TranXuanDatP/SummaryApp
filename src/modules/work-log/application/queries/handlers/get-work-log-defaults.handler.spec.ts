import { GetWorkLogDefaultsHandler } from './get-work-log-defaults.handler';
import { GetWorkLogDefaultsQuery } from '../get-work-log-defaults.query';
import { WorkLogDefaultsDto } from '../../dtos';
import { WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';
import { WorkLogDto } from '../../dtos/work-log.dto';

describe('GetWorkLogDefaultsHandler', () => {
  let handler: GetWorkLogDefaultsHandler;
  let workLogReadDao: jest.Mocked<IWorkLogReadDao>;

  beforeEach(() => {
    workLogReadDao = {
      findById: jest.fn(),
      findByProjectAndEmployeeAndDate: jest.fn(),
      findMostRecentByEmployee: jest.fn(),
      findAll: jest.fn(),
      findByEmployeeAndMonth: jest.fn(),
      findMonthlyReport: jest.fn(),
      findByExecutionDate: jest.fn(),
    };

    handler = new GetWorkLogDefaultsHandler(workLogReadDao as any);
  });

  it('should return suggested project from most recent WorkLog', async () => {
    const recentWorkLog = new WorkLogDto({
      id: 'wl-1',
      projectId: 'project-1',
      employeeId: 'emp-1',
      executionDate: '2026-05-18T00:00:00.000Z',
      content: 'Did some work',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
      version: 0,
      isEditable: true,
      editWindowClosesAt: '2026-05-21T00:00:00.000Z',
      projectName: 'Dự án Alpha',
      employeeName: 'Nguyễn Văn A',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    workLogReadDao.findMostRecentByEmployee.mockResolvedValue(recentWorkLog);

    const query = new GetWorkLogDefaultsQuery('emp-1');
    const result = await handler.execute(query);

    expect(result).toBeInstanceOf(WorkLogDefaultsDto);
    expect(result.suggestedProjectId).toBe('project-1');
    expect(result.suggestedProjectName).toBe('Dự án Alpha');
    expect(result.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return null project fields when no previous WorkLogs exist', async () => {
    workLogReadDao.findMostRecentByEmployee.mockResolvedValue(null);

    const query = new GetWorkLogDefaultsQuery('emp-new');
    const result = await handler.execute(query);

    expect(result.suggestedProjectId).toBeNull();
    expect(result.suggestedProjectName).toBeNull();
    expect(result.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return todayDate in YYYY-MM-DD format using local time', async () => {
    workLogReadDao.findMostRecentByEmployee.mockResolvedValue(null);

    const query = new GetWorkLogDefaultsQuery('emp-1');
    const result = await handler.execute(query);

    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result.todayDate).toBe(expected);
  });

  it('should treat empty string projectName as null', async () => {
    const recentWorkLog = new WorkLogDto({
      id: 'wl-1',
      projectId: 'project-1',
      employeeId: 'emp-1',
      executionDate: '2026-05-18T00:00:00.000Z',
      content: 'Did some work',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
      version: 0,
      isEditable: true,
      editWindowClosesAt: '2026-05-21T00:00:00.000Z',
      projectName: '',
      employeeName: 'Nguyễn Văn A',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    workLogReadDao.findMostRecentByEmployee.mockResolvedValue(recentWorkLog);

    const query = new GetWorkLogDefaultsQuery('emp-1');
    const result = await handler.execute(query);

    expect(result.suggestedProjectId).toBe('project-1');
    expect(result.suggestedProjectName).toBeNull();
  });
});
