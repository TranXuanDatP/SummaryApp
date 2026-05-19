import { GetMonthlyReportHandler } from './get-monthly-report.handler';
import { GetMonthlyReportQuery } from '../get-monthly-report.query';
import { MonthlyReportEntryDto } from '../../dtos';
import { WorkLogDto } from '../../dtos/work-log.dto';
import type { IWorkLogReadDao } from '../ports';

type WorkLogDtoParams = ConstructorParameters<typeof WorkLogDto>[0];

function makeWorkLog(overrides: Partial<WorkLogDtoParams> = {}): WorkLogDto {
  const defaults: WorkLogDtoParams = {
    id: 'wl-1',
    projectId: 'proj-1',
    employeeId: 'emp-1',
    executionDate: '2026-05-01T00:00:00.000Z',
    content: 'Test content',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
    version: 1,
    isEditable: true,
    editWindowClosesAt: '2026-05-06T00:00:00.000Z',
    projectName: 'Project A',
    employeeName: 'John Doe',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
  };
  return new WorkLogDto({ ...defaults, ...overrides });
}

describe('GetMonthlyReportHandler', () => {
  let handler: GetMonthlyReportHandler;
  let workLogReadDao: jest.Mocked<IWorkLogReadDao>;

  beforeEach(() => {
    workLogReadDao = {
      findById: jest.fn(),
      findByProjectAndEmployeeAndDate: jest.fn(),
      findMostRecentByEmployee: jest.fn(),
      findAll: jest.fn(),
      findByEmployeeAndMonth: jest.fn(),
      findMonthlyReport: jest.fn(),
    };

    handler = new GetMonthlyReportHandler(workLogReadDao as any);
  });

  it('should return paginated result with correct shape', async () => {
    const workLogs = [makeWorkLog(), makeWorkLog({ id: 'wl-2' })];
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: workLogs, total: 2 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 20, 'employee');
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.data[0]).toBeInstanceOf(MonthlyReportEntryDto);
  });

  it('should map WorkLogDto to MonthlyReportEntryDto with date formatted as YYYY-MM-DD', async () => {
    const workLog = makeWorkLog({ executionDate: '2026-05-15T00:00:00.000Z' });
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [workLog], total: 1 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 20, 'employee');
    const result = await handler.execute(query);

    expect(result.data[0].date).toBe('2026-05-15');
    expect(result.data[0].id).toBe('wl-1');
    expect(result.data[0].projectName).toBe('Project A');
    expect(result.data[0].employeeName).toBe('John Doe');
  });

  it('should always return empty comments array', async () => {
    const workLog = makeWorkLog();
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [workLog], total: 1 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 20, 'employee');
    const result = await handler.execute(query);

    expect(result.data[0].comments).toEqual([]);
  });

  it('should pass employee filter for employee role', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 20, 'employee');
    await handler.execute(query);

    expect(workLogReadDao.findMonthlyReport).toHaveBeenCalledWith({
      month: 5,
      year: 2026,
      employeeId: 'emp-1',
      projectId: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('should pass employee filter for manager with specific employeeId', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-2', undefined, 1, 20, 'manager');
    await handler.execute(query);

    expect(workLogReadDao.findMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-2' }),
    );
  });

  it('should allow manager to see all employees when no employeeId provided', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, undefined, undefined, 1, 20, 'manager');
    await handler.execute(query);

    expect(workLogReadDao.findMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: undefined }),
    );
  });

  it('should filter by projectId', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', 'proj-2', 1, 20, 'employee');
    await handler.execute(query);

    expect(workLogReadDao.findMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-2' }),
    );
  });

  it('should return empty result with zero totals', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 20, 'employee');
    const result = await handler.execute(query);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 25 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 10, 'employee');
    const result = await handler.execute(query);

    expect(result.totalPages).toBe(3);
  });

  it('should calculate totalPages as 1 when total equals limit', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 10 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 1, 10, 'employee');
    const result = await handler.execute(query);

    expect(result.totalPages).toBe(1);
  });

  it('should pass correct pagination parameters to DAO', async () => {
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });

    const query = new GetMonthlyReportQuery(5, 2026, 'emp-1', undefined, 3, 15, 'employee');
    await handler.execute(query);

    expect(workLogReadDao.findMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 15 }),
    );
  });

  it('should map all WorkLogDto fields to MonthlyReportEntryDto', async () => {
    const workLog = makeWorkLog({
      id: 'wl-x',
      projectId: 'proj-x',
      employeeId: 'emp-x',
      executionDate: '2026-03-10T00:00:00.000Z',
      content: 'Detailed content',
      isEditable: false,
      editWindowClosesAt: '2026-03-15T00:00:00.000Z',
      version: 3,
      projectName: 'Special Project',
      employeeName: 'Jane Smith',
    });
    workLogReadDao.findMonthlyReport.mockResolvedValue({ data: [workLog], total: 1 });

    const result = await handler.execute(new GetMonthlyReportQuery(3, 2026, 'emp-x', undefined, 1, 20, 'employee'));

    const entry = result.data[0];
    expect(entry.id).toBe('wl-x');
    expect(entry.date).toBe('2026-03-10');
    expect(entry.projectId).toBe('proj-x');
    expect(entry.projectName).toBe('Special Project');
    expect(entry.employeeId).toBe('emp-x');
    expect(entry.employeeName).toBe('Jane Smith');
    expect(entry.content).toBe('Detailed content');
    expect(entry.isEditable).toBe(false);
    expect(entry.editWindowClosesAt).toBe('2026-03-15T00:00:00.000Z');
    expect(entry.version).toBe(3);
    expect(entry.comments).toEqual([]);
  });
});
