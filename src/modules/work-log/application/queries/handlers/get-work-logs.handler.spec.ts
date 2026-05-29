import { GetWorkLogsHandler } from './get-work-logs.handler';
import { GetWorkLogsQuery } from '../get-work-logs.query';
import { WorkLogDto } from '../../dtos';

function makeDto(overrides: Partial<WorkLogDto> = {}): WorkLogDto {
  return Object.assign(
    new WorkLogDto({
      id: 'wl-1',
      projectId: 'proj-1',
      employeeId: 'emp-1',
      executionDate: '2026-05-18T00:00:00.000Z',
      content: 'Did work',
      sprintId: null,
      workType: null,
      sprintName: null,
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
      status: 'in_progress',
      version: 1,
      isEditable: true,
      editWindowClosesAt: '2026-05-21T00:00:00.000Z',
      projectName: 'Project A',
      employeeName: 'John Doe',
      createdAt: new Date('2026-05-18'),
      updatedAt: new Date('2026-05-18'),
    }),
    overrides,
  );
}

describe('GetWorkLogsHandler', () => {
  let handler: GetWorkLogsHandler;
  let mockReadDao: any;
  let mockCommentReadDao: any;

  beforeEach(() => {
    mockReadDao = {
      findAll: jest.fn(),
    };
    mockCommentReadDao = {
      findByWorkLogIds: jest.fn().mockResolvedValue([]),
    };
    handler = new GetWorkLogsHandler(mockReadDao, mockCommentReadDao);
  });

  it('should return paginated results for employee (own WorkLogs only)', async () => {
    const workLogs = [
      makeDto({ employeeId: 'emp-1' }),
      makeDto({ id: 'wl-2', employeeId: 'emp-1' }),
    ];
    mockReadDao.findAll.mockResolvedValue({ data: workLogs, total: 2 });

    const query = new GetWorkLogsQuery(
      'emp-1',
      undefined,
      undefined,
      1,
      20,
      'employee',
    );
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(mockReadDao.findAll).toHaveBeenCalledWith({
      employeeId: 'emp-1',
      projectId: undefined,
      executionDate: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('should return all WorkLogs for manager', async () => {
    const workLogs = [makeDto(), makeDto({ id: 'wl-2', employeeId: 'emp-2' })];
    mockReadDao.findAll.mockResolvedValue({ data: workLogs, total: 15 });

    const query = new GetWorkLogsQuery(
      undefined,
      undefined,
      undefined,
      1,
      20,
      'manager',
    );
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(15);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(mockReadDao.findAll).toHaveBeenCalledWith({
      employeeId: undefined,
      projectId: undefined,
      executionDate: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('should filter by projectId', async () => {
    const workLogs = [makeDto({ projectId: 'proj-1' })];
    mockReadDao.findAll.mockResolvedValue({ data: workLogs, total: 1 });

    const query = new GetWorkLogsQuery(
      'emp-1',
      'proj-1',
      undefined,
      1,
      20,
      'employee',
    );
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(1);
    expect(mockReadDao.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-1' }),
    );
  });

  it('should filter by executionDate', async () => {
    const date = new Date('2026-05-18');
    const workLogs = [makeDto()];
    mockReadDao.findAll.mockResolvedValue({ data: workLogs, total: 1 });

    const query = new GetWorkLogsQuery(
      'emp-1',
      undefined,
      date,
      1,
      20,
      'employee',
    );
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(1);
    expect(mockReadDao.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ executionDate: date }),
    );
  });

  it('should return empty results with correct pagination', async () => {
    mockReadDao.findAll.mockResolvedValue({ data: [], total: 0 });

    const query = new GetWorkLogsQuery(
      'emp-1',
      undefined,
      undefined,
      1,
      20,
      'employee',
    );
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly for multiple pages', async () => {
    mockReadDao.findAll.mockResolvedValue({ data: [makeDto()], total: 45 });

    const query = new GetWorkLogsQuery(
      undefined,
      undefined,
      undefined,
      2,
      20,
      'manager',
    );
    const result = await handler.execute(query);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  it('should attach comments to work logs', async () => {
    const workLogs = [makeDto(), makeDto({ id: 'wl-2' })];
    mockReadDao.findAll.mockResolvedValue({ data: workLogs, total: 2 });
    mockCommentReadDao.findByWorkLogIds.mockResolvedValue([
      { workLogId: 'wl-1', content: 'Nice work!', managerName: 'Boss' },
    ]);

    const query = new GetWorkLogsQuery(undefined, undefined, undefined, 1, 20, 'manager');
    const result = await handler.execute(query);

    expect(mockCommentReadDao.findByWorkLogIds).toHaveBeenCalledWith(['wl-1', 'wl-2']);
    expect(result.data[0].comments).toHaveLength(1);
    expect(result.data[0].comments![0].content).toBe('Nice work!');
    expect(result.data[1].comments).toHaveLength(0);
  });
});
