import { GetCalendarViewHandler } from './get-calendar-view.handler';
import { GetCalendarViewQuery } from '../get-calendar-view.query';
import { CalendarDayDto, WorkLogDto } from '../../dtos';
import {
  WORK_LOG_READ_DAO_TOKEN,
  BUSINESS_DAY_CALCULATOR_TOKEN,
} from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';
import type { IBusinessDayCalculator } from '../../../domain/services';

function makeWorkLogDto(
  overrides: Partial<{
    id: string;
    executionDate: string;
    isUnlocked: boolean;
  }> = {},
): WorkLogDto {
  return new WorkLogDto({
    id: overrides.id ?? 'wl-1',
    projectId: 'project-1',
    employeeId: 'emp-1',
    executionDate: overrides.executionDate ?? '2026-05-15T00:00:00.000Z',
    content: 'Worked on feature',
    sprintId: null,
    workType: null,
      sprintName: null,
    isUnlocked: overrides.isUnlocked ?? false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
      status: 'in_progress',
    version: 0,
    isEditable: true,
    editWindowClosesAt: '2026-05-18T00:00:00.000Z',
    projectName: 'Project Alpha',
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

describe('GetCalendarViewHandler', () => {
  let handler: GetCalendarViewHandler;
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

    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );
  });

  it('should generate correct number of days for a month', async () => {
    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result).toHaveLength(31);
    result.forEach((day) => {
      expect(day).toBeInstanceOf(CalendarDayDto);
      expect(day.date).toMatch(/^2026-05-\d{2}$/);
    });
  });

  it('should generate correct number of days for February (28 days)', async () => {
    const query = new GetCalendarViewQuery('emp-1', 2, 2026);
    const result = await handler.execute(query);

    expect(result).toHaveLength(28);
  });

  it('should mark weekend days as non-business-day and not editable', async () => {
    const isBusinessDay = jest.fn().mockImplementation((date: Date) => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    });
    calculator = stubCalculator({ isBusinessDay });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const weekends = result.filter((d) => !d.isBusinessDay);
    expect(weekends.length).toBeGreaterThan(0);
    weekends.forEach((d) => {
      expect(d.isEditable).toBe(false);
      expect(d.hasWorkLog).toBe(false);
    });
  });

  it('should mark day with WorkLog within window as editable with editWindowClosesAt', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({
        id: 'wl-15',
        executionDate: '2026-05-15T00:00:00.000Z',
      }),
    ]);

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: jest.fn().mockReturnValue(2),
      getEditWindowClosesAt: jest
        .fn()
        .mockReturnValue(new Date('2026-05-18T00:00:00.000Z')),
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day15 = result.find((d) => d.date === '2026-05-15');
    expect(day15).toBeDefined();
    expect(day15!.hasWorkLog).toBe(true);
    expect(day15!.workLogId).toBe('wl-15');
    expect(day15!.isEditable).toBe(true);
    expect(day15!.editWindowClosesAt).toBe('2026-05-18T00:00:00.000Z');
  });

  it('should mark day with WorkLog past window as not editable', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({ id: 'wl-5', executionDate: '2026-05-05T00:00:00.000Z' }),
    ]);

    const countBizDays = jest.fn().mockImplementation((start: Date) => {
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return dateStr === '2026-05-05' ? 5 : 1;
    });

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: countBizDays,
      getEditWindowClosesAt: jest
        .fn()
        .mockReturnValue(new Date('2026-05-08T00:00:00.000Z')),
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day5 = result.find((d) => d.date === '2026-05-05');
    expect(day5!.hasWorkLog).toBe(true);
    expect(day5!.isEditable).toBe(false);
  });

  it('should mark unlocked WorkLog as editable regardless of window', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({
        id: 'wl-unlocked',
        executionDate: '2026-05-01T00:00:00.000Z',
        isUnlocked: true,
      }),
    ]);

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: jest.fn().mockReturnValue(10),
      getEditWindowClosesAt: jest
        .fn()
        .mockReturnValue(new Date('2026-05-04T00:00:00.000Z')),
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day1 = result.find((d) => d.date === '2026-05-01');
    expect(day1!.hasWorkLog).toBe(true);
    expect(day1!.isEditable).toBe(true);
  });

  it('should mark business day without WorkLog within window as editable', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const countBizDays = jest.fn().mockImplementation((start: Date) => {
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return dateStr === '2026-05-18' ? 2 : 1;
    });

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: countBizDays,
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day18 = result.find((d) => d.date === '2026-05-18');
    expect(day18!.hasWorkLog).toBe(false);
    expect(day18!.isEditable).toBe(true);
  });

  it('should mark business day without WorkLog past window as not editable', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const countBizDays = jest.fn().mockImplementation((start: Date) => {
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      return dateStr === '2026-05-10' ? 5 : 1;
    });

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: countBizDays,
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day10 = result.find((d) => d.date === '2026-05-10');
    expect(day10!.hasWorkLog).toBe(false);
    expect(day10!.isEditable).toBe(false);
  });

  it('should return all days with hasWorkLog false when month has no WorkLogs', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    expect(result).toHaveLength(31);
    result.forEach((day) => {
      expect(day.hasWorkLog).toBe(false);
      expect(day.workLogId).toBeNull();
    });
  });

  it('should set editWindowClosesAt to null for days without WorkLog', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([]);

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    result.forEach((day) => {
      if (!day.hasWorkLog) {
        expect(day.editWindowClosesAt).toBeNull();
      }
    });
  });

  it('should set editWindowClosesAt for days with WorkLog', async () => {
    workLogReadDao.findByEmployeeAndMonth.mockResolvedValue([
      makeWorkLogDto({
        id: 'wl-10',
        executionDate: '2026-05-10T00:00:00.000Z',
      }),
    ]);

    calculator = stubCalculator({
      isBusinessDay: jest.fn().mockReturnValue(true),
      countBusinessDaysBetween: jest.fn().mockReturnValue(2),
      getEditWindowClosesAt: jest
        .fn()
        .mockReturnValue(new Date('2026-05-13T00:00:00.000Z')),
    });
    handler = new GetCalendarViewHandler(
      workLogReadDao as any,
      calculator as any,
    );

    const query = new GetCalendarViewQuery('emp-1', 5, 2026);
    const result = await handler.execute(query);

    const day10 = result.find((d) => d.date === '2026-05-10');
    expect(day10!.editWindowClosesAt).toBe('2026-05-13T00:00:00.000Z');
  });

  it('should call DAO with correct employeeId, month, year', async () => {
    const query = new GetCalendarViewQuery('emp-42', 6, 2026);
    await handler.execute(query);

    expect(workLogReadDao.findByEmployeeAndMonth).toHaveBeenCalledWith(
      'emp-42',
      6,
      2026,
    );
  });
});
