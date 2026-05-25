import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { WorkLogDto } from '../../application/dtos';

export interface IExcelExportService {
  generateMonthlyReport(
    workLogs: WorkLogDto[],
    options: {
      employeeName: string;
      month: number;
      year: number;
      department?: string;
    },
  ): Promise<Buffer>;
}

const FONT = { size: 11, name: 'Times New Roman' };

const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { theme: 6, tint: 0.5999938962981048 },
};

const SECTION_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FF92D050' },
};

const NOTE_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFFFC000' },
};

const THIN_BORDER = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

const CENTER = {
  horizontal: 'center' as const,
  vertical: 'middle' as const,
  wrapText: true,
};

const HEADERS = [
  'STT',
  'NỘI DUNG CÔNG VIỆC ',
  'KẾ HOẠCH ĐẶT RA ',
  'THỰC HIỆN ',
  'KẾT QUẢ : %',
  'Ý KIẾN ĐỀ XUẤT',
  'GHI CHÚ ',
];

const COL_WIDTHS = [12.55, 32.44, 38.33, 44.55, 19.89, 29.33, 29.55];

// Data model matching the reference structure
interface Detail {
  actual: string;
  result?: number | string;
  suggestion?: string;
  note?: string;
}

interface WeekItem {
  week: string; // "Tuần 1"
  plan: string;
  details: Detail[];
}

interface Section {
  id: string; // "I", "II", etc.
  title: string;
  items: WeekItem[];
}

function calcWeekOfMonth(executionDate: string): number {
  const d = new Date(executionDate);
  const day = d.getUTCDate();
  return Math.floor((day - 1) / 7) + 1;
}

function groupWorkLogsToSections(
  workLogs: WorkLogDto[],
  month: number,
): Section[] {
  // Section I: Công việc chung — all work logs grouped by week
  const weekMap = new Map<number, WorkLogDto[]>();
  for (const wl of workLogs) {
    const week = calcWeekOfMonth(wl.executionDate);
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(wl);
  }

  const items: WeekItem[] = [];
  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);
  for (const [weekNum, logs] of sortedWeeks) {
    const details: Detail[] = logs.map((wl) => ({
      actual: wl.content || '',
    }));
    items.push({ week: `Tuần ${weekNum}`, plan: '', details });
  }

  const nextMonth = month === 12 ? 1 : month + 1;

  return [
    { id: 'I', title: 'Công việc chung', items },
    { id: 'II', title: 'Hỗ trợ phòng ban khác', items: [] },
    { id: 'III', title: `Kế hoạch tháng ${nextMonth}`, items: [] },
  ];
}

function applyRowStyle(
  ws: any,
  row: number,
  opts?: { bold?: boolean; fill?: any },
) {
  for (let col = 1; col <= 7; col++) {
    const cell = ws.getCell(row, col);
    cell.border = THIN_BORDER;
    cell.alignment = CENTER;
    cell.font = opts?.bold ? { ...FONT, bold: true } : FONT;
    if (opts?.fill) cell.fill = opts.fill;
  }
}

@Injectable()
export class ExcelExportService implements IExcelExportService {
  async generateMonthlyReport(
    workLogs: WorkLogDto[],
    options: {
      employeeName: string;
      month: number;
      year: number;
      department?: string;
    },
  ): Promise<Buffer> {
    const wb = new Workbook();
    const ws = wb.addWorksheet(`Tháng ${options.month}`);
    const department = options.department || 'IT';

    for (let i = 0; i < COL_WIDTHS.length; i++) {
      ws.getColumn(i + 1).width = COL_WIDTHS[i];
    }

    // Row 1: empty
    // Row 2: Title merged A2:G2
    ws.mergeCells('A2:G2');
    ws.getCell('A2').value =
      `BÁO CÁO CÔNG VIỆC THÁNG ${options.month}.${options.year}`;
    ws.getCell('A2').font = FONT;
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: "Họ và Tên"
    ws.getCell('C3').value = `Họ và Tên: ${options.employeeName}`;
    ws.getCell('C3').font = FONT;
    ws.getCell('C3').alignment = CENTER;

    // Row 4: "Bộ phận"
    ws.getCell('C4').value = `Bộ phận: ${department}`;
    ws.getCell('C4').font = FONT;
    ws.getCell('C4').alignment = CENTER;

    // Row 5: empty

    // Row 6-7: Header (2 rows, vertically merged)
    for (let col = 0; col < HEADERS.length; col++) {
      const letter = String.fromCharCode(65 + col);
      ws.mergeCells(`${letter}6:${letter}7`);
      const cell6 = ws.getCell(6, col + 1);
      cell6.value = HEADERS[col];
      cell6.font = FONT;
      cell6.fill = HEADER_FILL;
      cell6.alignment = CENTER;
      cell6.border = THIN_BORDER;
      ws.getCell(7, col + 1).fill = HEADER_FILL;
      ws.getCell(7, col + 1).border = THIN_BORDER;
    }

    let rowIdx = 8;

    const sections = groupWorkLogsToSections(workLogs, options.month);

    for (const section of sections) {
      // Section row: Roman numeral + title (green fill)
      ws.getCell(rowIdx, 1).value = section.id;
      ws.mergeCells(rowIdx, 2, rowIdx, 7);
      ws.getCell(rowIdx, 2).value = section.title;
      applyRowStyle(ws, rowIdx, { bold: true, fill: SECTION_FILL });
      rowIdx++;

      for (const item of section.items) {
        const startRow = rowIdx;

        for (let di = 0; di < item.details.length; di++) {
          const detail = item.details[di];
          const row = ws.getRow(rowIdx);

          // Col A: empty (STT)
          // Col B: week name (only first detail row)
          row.getCell(1).value = '';
          row.getCell(2).value = di === 0 ? item.week : '';
          // Col C: plan (only first detail row)
          row.getCell(3).value = di === 0 ? item.plan : '';
          // Col D: actual
          row.getCell(4).value = detail.actual;
          // Col E: result
          row.getCell(5).value = detail.result ?? '';
          // Col F: suggestion
          row.getCell(6).value = detail.suggestion ?? '';
          // Col G: note
          row.getCell(7).value = detail.note ?? '';

          applyRowStyle(ws, rowIdx);
          rowIdx++;
        }

        // Merge week + plan columns if multiple details
        if (item.details.length > 1) {
          ws.mergeCells(startRow, 2, rowIdx - 1, 2);
          ws.mergeCells(startRow, 3, rowIdx - 1, 3);
        }

        // Empty rows between items (2 rows)
        for (let e = 0; e < 2; e++) {
          applyRowStyle(ws, rowIdx);
          rowIdx++;
        }
      }
    }

    // Note row
    ws.getCell(rowIdx, 1).value = 'Note';
    ws.mergeCells(rowIdx, 2, rowIdx, 7);
    ws.getCell(rowIdx, 2).value =
      'Trưởng bộ phận báo cáo thêm tiến độ của từng dự án';
    applyRowStyle(ws, rowIdx, { bold: false, fill: NOTE_FILL });
    rowIdx += 2;

    // Signature row
    ws.getCell(rowIdx, 2).value = 'GIÁM ĐỐC/TRƯỞNG B/P';
    ws.getCell(rowIdx, 5).value = 'PHÒNG HCNS';
    ws.getCell(rowIdx, 6).value = 'NGƯỜI LẬP BÁO CÁO';
    ws.getCell(rowIdx, 2).font = FONT;
    ws.getCell(rowIdx, 5).font = FONT;
    ws.getCell(rowIdx, 6).font = FONT;
    ws.getCell(rowIdx, 2).alignment = CENTER;
    ws.getCell(rowIdx, 5).alignment = CENTER;
    ws.getCell(rowIdx, 6).alignment = CENTER;
    rowIdx += 2;

    // Reporter name
    ws.getCell(rowIdx, 6).value = options.employeeName;
    ws.getCell(rowIdx, 6).font = FONT;
    ws.getCell(rowIdx, 6).alignment = CENTER;

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
