import { Workbook } from 'exceljs';
import { ExcelExportService } from './excel-export.service';
import { WorkLogDto } from '../../application/dtos/work-log.dto';

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

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  beforeEach(() => {
    service = new ExcelExportService();
  });

  async function readBuffer(buffer: Buffer) {
    const wb = new Workbook();
    await wb.xlsx.load(buffer as any);
    return wb;
  }

  function getSheet(wb: Workbook): import('exceljs').Worksheet {
    return wb.getWorksheet(1)!;
  }

  it('should produce a non-empty buffer', async () => {
    const workLogs = [makeWorkLog()];
    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should create sheet named "Báo cáo tháng"', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const wb = await readBuffer(buffer);
    expect(wb.worksheets[0].name).toBe('Báo cáo tháng');
  });

  it('should have 8 header columns on row 6', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));

    expect(ws.getCell(6, 1).value).toBe('STT');
    expect(ws.getCell(6, 2).value).toBe('TÊN SẢN PHẨM/ DỰ ÁN');
    expect(ws.getCell(6, 3).value).toBe('THỜI GIAN (TUẦN)');
    expect(ws.getCell(6, 4).value).toBe('KẾ HOẠCH ĐẶT RA');
    expect(ws.getCell(6, 5).value).toBe('THỰC HIỆN');
    expect(ws.getCell(6, 6).value).toBe('KẾT QUẢ : %');
    expect(ws.getCell(6, 7).value).toBe('Ý KIẾN ĐỀ XUẤT');
    expect(ws.getCell(6, 8).value).toBe('GHI CHÚ');
  });

  it('should have "Bộ phận: IT" on row 4', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell('C4').value).toBe('Bộ phận: IT');
  });

  it('should produce valid Excel with header only when no data', async () => {
    const buffer = await service.generateMonthlyReport([], {
      employeeName: 'Nobody',
      month: 5,
      year: 2026,
    });

    expect(buffer.length).toBeGreaterThan(0);
    const ws = getSheet(await readBuffer(buffer));
    // Row 6 = header, row 7 should not have data values
    expect(ws.getCell(6, 1).value).toBe('STT');
    expect(ws.getCell(7, 1).value).toBeNull();
  });

  it('should group work logs by project + week', async () => {
    const workLogs = [
      makeWorkLog({ id: 'wl-1', executionDate: '2026-05-02T00:00:00.000Z', content: 'Task A', projectId: 'proj-1', projectName: 'Project A' }),
      makeWorkLog({ id: 'wl-2', executionDate: '2026-05-03T00:00:00.000Z', content: 'Task B', projectId: 'proj-1', projectName: 'Project A' }),
      makeWorkLog({ id: 'wl-3', executionDate: '2026-05-10T00:00:00.000Z', content: 'Task C', projectId: 'proj-2', projectName: 'Project B' }),
    ];

    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });

    const ws = getSheet(await readBuffer(buffer));

    // Row 7: Section for Project A
    expect(ws.getCell(7, 2).value).toBe('Project A');

    // Row 8: Data row for Project A, Week 1 (days 2,3)
    expect(ws.getCell(8, 3).value).toBe('Tuần 1');
    expect(ws.getCell(8, 5).value).toContain('- Task A');
    expect(ws.getCell(8, 5).value).toContain('- Task B');

    // Row 9: Section for Project B
    expect(ws.getCell(9, 2).value).toBe('Project B');

    // Row 10: Data row for Project B, Week 2 (day 10)
    expect(ws.getCell(10, 3).value).toBe('Tuần 2');
    expect(ws.getCell(10, 5).value).toBe('- Task C');
  });

  it('should calculate week of month correctly', async () => {
    const workLogs = [
      makeWorkLog({ executionDate: '2026-05-01T00:00:00.000Z', projectId: 'p1', projectName: 'P1' }), // day 1 → week 1
      makeWorkLog({ executionDate: '2026-05-07T00:00:00.000Z', projectId: 'p2', projectName: 'P2' }), // day 7 → week 1
      makeWorkLog({ executionDate: '2026-05-08T00:00:00.000Z', projectId: 'p3', projectName: 'P3' }), // day 8 → week 2
      makeWorkLog({ executionDate: '2026-05-31T00:00:00.000Z', projectId: 'p4', projectName: 'P4' }), // day 31 → week 5
    ];

    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });

    const ws = getSheet(await readBuffer(buffer));

    // Find all cells with "Tuần" values
    const weeks: string[] = [];
    for (let row = 7; row <= ws.rowCount; row++) {
      const val = ws.getCell(row, 3).value as string;
      if (val && val.startsWith('Tuần')) {
        weeks.push(val);
      }
    }

    // Projects are sorted by name P1<P2<P3<P4, each gets its own section+data row
    expect(weeks).toEqual(['Tuần 1', 'Tuần 1', 'Tuần 2', 'Tuần 5']);
  });

  it('should deduplicate identical content within a group', async () => {
    const workLogs = [
      makeWorkLog({ id: 'wl-1', executionDate: '2026-05-02T00:00:00.000Z', content: 'Same task', projectId: 'p1', projectName: 'P1' }),
      makeWorkLog({ id: 'wl-2', executionDate: '2026-05-03T00:00:00.000Z', content: 'Same task', projectId: 'p1', projectName: 'P1' }),
    ];

    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });

    const ws = getSheet(await readBuffer(buffer));

    // Row 8: data row for P1 week 1
    const content = ws.getCell(8, 5).value as string;
    const occurrences = content.split('- Same task').length - 1;
    expect(occurrences).toBe(1);
  });

  it('should apply section number sequentially per project', async () => {
    const workLogs = [
      makeWorkLog({ projectId: 'p1', projectName: 'Alpha' }),
      makeWorkLog({ projectId: 'p2', projectName: 'Beta' }),
      makeWorkLog({ projectId: 'p3', projectName: 'Gamma' }),
    ];

    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });

    const ws = getSheet(await readBuffer(buffer));

    expect(ws.getCell(7, 1).value).toBe(1); // Alpha section
    expect(ws.getCell(9, 1).value).toBe(2); // Beta section
    expect(ws.getCell(11, 1).value).toBe(3); // Gamma section
  });

  it('should handle single work log correctly', async () => {
    const workLogs = [makeWorkLog({ projectName: 'Solo Project', content: 'Only task' })];

    const buffer = await service.generateMonthlyReport(workLogs, {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });

    const ws = getSheet(await readBuffer(buffer));

    // Row 7: section row
    expect(ws.getCell(7, 2).value).toBe('Solo Project');

    // Row 8: data row
    expect(ws.getCell(8, 5).value).toBe('- Only task');
  });
});
