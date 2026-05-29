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
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should create sheet named "Tháng 5"', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const wb = await readBuffer(buffer);
    expect(wb.worksheets[0].name).toBe('Tháng 5');
  });

  it('should have Row 1 empty, title on Row 2', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell(1, 1).value).toBeNull();
    expect(ws.getCell('A2').value).toBe('BÁO CÁO CÔNG VIỆC THÁNG 5.2026');
  });

  it('should have "Họ và Tên" at C3', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'Trần Xuân Đạt',
      month: 3,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell('C3').value).toBe('Họ và Tên: Trần Xuân Đạt');
  });

  it('should have "Bộ phận" at C4', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell('C4').value).toBe('Bộ phận: IT');
  });

  it('should have 7 headers on Row 6-7 (vertically merged)', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John Doe',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell(6, 1).value).toBe('STT');
    expect(ws.getCell(6, 2).value).toContain('NỘI DUNG');
    expect(ws.getCell(6, 3).value).toContain('KẾ HOẠCH');
    expect(ws.getCell(6, 4).value).toContain('THỰC HIỆN');
    expect(ws.getCell(6, 5).value).toContain('KẾT QUẢ');
    expect(ws.getCell(6, 6).value).toContain('Ý KIẾN');
    expect(ws.getCell(6, 7).value).toContain('GHI CHÚ');
  });

  it('should produce valid Excel with 3 empty sections and Note row when no data', async () => {
    const buffer = await service.generateMonthlyReport([], {
      employeeName: 'Nobody',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell(6, 1).value).toBe('STT');
    // Section I at row 8 (no data, no emptyRows)
    // Section II at row 9, then 5 empty rows (10-14)
    // Section III at row 15, then 5 empty rows (16-20)
    // Note at row 21
    expect(ws.getCell(8, 1).value).toBe('I');
    expect(ws.getCell(8, 2).value).toBe('Công việc chung');
    expect(ws.getCell(9, 1).value).toBe('II');
    expect(ws.getCell(9, 2).value).toBe('Hỗ trợ phòng ban khác');
    expect(ws.getCell(15, 1).value).toBe('III');
    expect(ws.getCell(15, 2).value).toBe('Kế hoạch tháng 6');
    expect(ws.getCell(21, 1).value).toBe('Note');
  });

  it('should have section with Roman numeral and green fill', async () => {
    const buffer = await service.generateMonthlyReport(
      [makeWorkLog({ projectName: 'Project A', content: 'Task' })],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell(8, 1).value).toBe('I');
    expect((ws.getCell(8, 1).fill as any).fgColor.argb).toBe('FF92D050');
    expect(ws.getCell(8, 2).value).toBe('Công việc chung');
  });

  it('should put work log content in column D (THỰC HIỆN)', async () => {
    const buffer = await service.generateMonthlyReport(
      [makeWorkLog({ projectName: 'P1', content: 'Task A' })],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));
    // Row 9 = first data row after section I header
    expect(ws.getCell(9, 3).value).toBe('P1');
    expect(ws.getCell(9, 4).value).toBe('[2026-05-01] Task A');
  });

  it('should render multiple work logs in same project group consecutively', async () => {
    const buffer = await service.generateMonthlyReport(
      [
        makeWorkLog({
          executionDate: '2026-05-01T00:00:00.000Z',
          projectId: 'p1',
          projectName: 'P1',
          content: 'A',
        sprintId: null,
        workType: null,
      sprintName: null,
        }),
        makeWorkLog({
          executionDate: '2026-05-08T00:00:00.000Z',
          projectId: 'p1',
          projectName: 'P1',
          content: 'B',
        sprintId: null,
        workType: null,
      sprintName: null,
        }),
      ],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));

    // Row 8: section I, Row 9-10: data rows, Row 11: empty separator
    expect(ws.getCell(9, 3).value).toBe('P1');
    expect(ws.getCell(9, 4).value).toBe('[2026-05-01] A');
    expect(ws.getCell(10, 4).value).toBe('[2026-05-08] B');
  });

  it('should always have 3 fixed sections regardless of projects', async () => {
    const buffer = await service.generateMonthlyReport(
      [
        makeWorkLog({ projectId: 'p1', projectName: 'Alpha', content: 'A' }),
        makeWorkLog({ projectId: 'p2', projectName: 'Beta', content: 'B' }),
      ],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));

    const sections: { row: number; id: string; name: string }[] = [];
    for (let r = 8; r <= ws.rowCount; r++) {
      const id = ws.getCell(r, 1).value as string;
      if (['I', 'II', 'III'].includes(id)) {
        sections.push({ row: r, id, name: ws.getCell(r, 2).value as string });
      }
    }
    expect(sections.length).toBe(3);
    expect(sections[0].id).toBe('I');
    expect(sections[0].name).toBe('Công việc chung');
    expect(sections[1].id).toBe('II');
    expect(sections[1].name).toBe('Hỗ trợ phòng ban khác');
    expect(sections[2].id).toBe('III');
    expect(sections[2].name).toBe('Kế hoạch tháng 6');
  });

  it('should merge STT and plan columns when multiple details exist', async () => {
    // Two work logs on same project = 1 project group with 2 data rows
    const buffer = await service.generateMonthlyReport(
      [
        makeWorkLog({
          executionDate: '2026-05-01T00:00:00.000Z',
          projectId: 'p1',
          projectName: 'P1',
          content: 'Task A',
        sprintId: null,
        workType: null,
      sprintName: null,
        }),
        makeWorkLog({
          executionDate: '2026-05-02T00:00:00.000Z',
          projectId: 'p1',
          projectName: 'P1',
          content: 'Task B',
        sprintId: null,
        workType: null,
      sprintName: null,
        }),
      ],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));

    // Row 9: first detail, Row 10: second detail (STT and KẾ HOẠCH merged)
    expect(ws.getCell(9, 3).value).toBe('P1');
    expect(ws.getCell(9, 4).value).toBe('[2026-05-01] Task A');
    expect(ws.getCell(10, 4).value).toBe('[2026-05-02] Task B');
  });

  it('should have Note row with orange fill at bottom', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    // Find note row
    let found = false;
    for (let r = 8; r <= ws.rowCount; r++) {
      if (ws.getCell(r, 1).value === 'Note') {
        expect((ws.getCell(r, 1).fill as any).fgColor.argb).toBe('FFFFC000');
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('should have signature row with reporter name', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'Trần Xuân Đạt',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    let found = false;
    for (let r = 1; r <= ws.rowCount; r++) {
      if (ws.getCell(r, 6).value === 'Trần Xuân Đạt') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('should use Times New Roman 11pt everywhere', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell('A2').font.name).toBe('Times New Roman');
    expect(ws.getCell('A2').font.size).toBe(11);
    expect(ws.getCell(6, 1).font.name).toBe('Times New Roman');
    expect(ws.getCell(6, 1).font.size).toBe(11);
  });

  it('should apply thin borders to data rows', async () => {
    const buffer = await service.generateMonthlyReport([makeWorkLog()], {
      employeeName: 'John',
      month: 5,
      year: 2026,
    });
    const ws = getSheet(await readBuffer(buffer));
    expect(ws.getCell(9, 2).border.top?.style).toBe('thin');
  });

  it('should group work logs by project', async () => {
    const buffer = await service.generateMonthlyReport(
      [
        makeWorkLog({
          executionDate: '2026-05-01T00:00:00.000Z',
          projectId: 'p1',
          projectName: 'P1',
        }),
        makeWorkLog({
          executionDate: '2026-05-08T00:00:00.000Z',
          projectId: 'p2',
          projectName: 'P2',
        }),
        makeWorkLog({
          executionDate: '2026-05-31T00:00:00.000Z',
          projectId: 'p3',
          projectName: 'P3',
        }),
      ],
      { employeeName: 'John', month: 5, year: 2026 },
    );
    const ws = getSheet(await readBuffer(buffer));

    const projects: string[] = [];
    for (let r = 9; r <= 14; r++) {
      const val = ws.getCell(r, 3).value as string;
      if (val && val !== '') projects.push(val);
    }
    expect(projects).toEqual(['P1', 'P2', 'P3']);
  });
});
