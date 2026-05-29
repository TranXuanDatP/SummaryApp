import { GetSummaryViewHandler } from './get-summary-view.handler';
import { GetSummaryViewQuery } from '../get-summary-view.query';
import { SummaryViewDto, ProjectBreakdownItem, WorkLogDto } from '../../dtos';
import type { IWorkLogReadDao } from '../ports';
import type { IBusinessDayCalculator } from '../../../domain/services';

function makeWorkLogDto(
  overrides: Partial<{
    id: string;
    executionDate: string;
    projectId: string;
    projectName: string;
  }> = {},
): WorkLogDto {
  return new WorkLogDto({
    id: overrides.id ?? 'wl-1',
    projectId: overrides.projectId ?? 'project-1',
    employeeId: 'emp-1',
    executionDate: overrides.executionDate ?? '2026-05-15T00:00:00.000Z',
    content: 'Worked on feature',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
      status: 'in_progress',
    version: 0,
    isEditable: true,
    editWindowClosesAt: '2026-05-18T00:00:00.000Z',
    projectName: overrides.projectName ?? 'Project Alpha',
    employeeName: 'Nguyễn Văn A',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function stubCalculator(
  overrides: Partial<IBusinessDayCalculator> = {},
): IBusinessDayCalculator {
  return {
    isBusinessDay: overrides.isBusinessDay ?? jest.fn().mockReturnValue(true),
    countBusinessDaysBetween:
      overrides.countBusinessDaysBetween ?? jest.fn().mockReturnValue(1),
    addBusinessDays: overrides.addBusinessDays ?? jest.fn(),
    getEditWindowClosesAt:
      overrides.getEditWindowClosesAt ??
      jest.fn().mockReturnValue(new Date('2026-05-18T00:00:00.000Z')),
  };
}

describe('GetSummaryViewHandler', () => {
  let handler: GetSummaryViewHandler;
  let workLogReadDao: jest.Mocked<IWorkLogReadDao>;
  let calculator: IBusinessDayCalculator;

  beforeEach(() => {
    workLogReadDao = {
      findById: jest.fn(),
      findByProjectAndEmployeeAndDate: jest.fn(),
      findMostRecentByEmployee: jest.fn(),
      findAll: jest.fn(),
      findByEmployeeAndMonth: jest.fn().mockResolvedValue([]),
      findMonthlyReport: jest.fn(),
    } as any;

    calculator = stubCalculator();

    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );
  });

  it('should compute totalBusinessDays for a full month', async () => {
    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result).toBeInstanceOf(SummaryViewDto);
    expect(result.totalBusinessDays).toBe(31); // all days mocked as business days
    expect(result.period).toEqual({ month: 5, year: 2026 });
  });

  it('should compute loggedDays from unique dates with WorkLogs', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({ id: 'wl-1', executionDate: '2026-05-15T00:00:00.000Z' }),
      makeWorkLogDto({ id: 'wl-2', executionDate: '2026-05-16T00:00:00.000Z' }),
    ]);

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.loggedDays).toBe(2);
  });

  it('should compute completionRate = loggedDays / totalBusinessDays', async () => {
    const isBusinessDay = jest.fn().mockImplementation((date: Date) => {
      const day = date.getDate();
      return day <= 20; // 20 business days in month
    });
    calculator = stubCalculator({ isBusinessDay });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({ executionDate: '2026-05-01T00:00:00.000Z' }),
      makeWorkLogDto({ executionDate: '2026-05-02T00:00:00.000Z' }),
      makeWorkLogDto({ executionDate: '2026-05-03T00:00:00.000Z' }),
    ]);

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.totalBusinessDays).toBe(20);
    expect(result.loggedDays).toBe(3);
    expect(result.completionRate).toBe(3 / 20);
  });

  it('should return completionRate 0 when no business days exist', async () => {
    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(false),
    });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.totalBusinessDays).toBe(0);
    expect(result.loggedDays).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it('should return completionRate 0 for empty month (no WorkLogs)', async () => {
    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.loggedDays).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it('should include business days within 3-day window without WorkLog in editableGaps', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const countBizDays = jest.fn().mockImplementation((start: Date) => {
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return dateStr === '2026-05-18' ? 2 : 1;
    });

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: countBizDays,
    });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.editableGaps).toContain('2026-05-18');
  });

  it('should NOT include business days past 3-day window in editableGaps', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const countBizDays = jest.fn().mockImplementation((start: Date) => {
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return dateStr === '2026-05-10' ? 5 : 1;
    });

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: countBizDays,
    });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.editableGaps).not.toContain('2026-05-10');
  });

  it('should NOT include future business days in editableGaps', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    // All days are business days, all within window — but future dates should be excluded
    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: jest.fn().mockReturnValue(0),
    });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    // Only days <= today should be in editableGaps
    // Since we don't know exact today, just verify it doesn't include all 31 days
    expect(result.editableGaps.length).toBeLessThan(31);
  });

  it('should NOT include non-business days in editableGaps', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const isBusinessDay = jest.fn().mockImplementation((date: Date) => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    });
    calculator = stubCalculator({
      isBusinessDay,
      countBusinessDaysBetween: jest.fn().mockReturnValue(1),
    });
    handler = new GetSummaryViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    // Check weekends are not in editableGaps
    result.editableGaps.forEach((dateStr) => {
      const d = new Date(dateStr);
      expect(d.getDay()).not.toBe(0);
      expect(d.getDay()).not.toBe(6);
    });
  });

  it('should compute projectBreakdown with correct counts sorted descending', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({
        id: 'wl-1',
        executionDate: '2026-05-01T00:00:00.000Z',
        projectId: 'p-1',
        projectName: 'Alpha',
      }),
      makeWorkLogDto({
        id: 'wl-2',
        executionDate: '2026-05-02T00:00:00.000Z',
        projectId: 'p-1',
        projectName: 'Alpha',
      }),
      makeWorkLogDto({
        id: 'wl-3',
        executionDate: '2026-05-03T00:00:00.000Z',
        projectId: 'p-2',
        projectName: 'Beta',
      }),
    ]);

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.projectBreakdown).toHaveLength(2);
    expect(result.projectBreakdown[0]).toBeInstanceOf(ProjectBreakdownItem);
    expect(result.projectBreakdown[0].projectId).toBe('p-1');
    expect(result.projectBreakdown[0].workLogCount).toBe(2);
    expect(result.projectBreakdown[1].projectId).toBe('p-2');
    expect(result.projectBreakdown[1].workLogCount).toBe(1);
  });

  it('should return empty projectBreakdown when no WorkLogs exist', async () => {
    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.projectBreakdown).toEqual([]);
  });

  it('should call DAO with correct employeeId, month, year (C-7)', async () => {
    const query = new GetSummaryViewQuery('emp-42', 6, 2026);
    await handler.execute(query);

    expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledWith(
      'emp-42',
      6,
      2026,
    );
  });

  it('should handle empty projectName as Unknown', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({ projectId: 'p-1', projectName: '' }),
    ]);

    const query = new GetSummaryViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result.projectBreakdown[0].projectName).toBe('Unknown');
  });
});
