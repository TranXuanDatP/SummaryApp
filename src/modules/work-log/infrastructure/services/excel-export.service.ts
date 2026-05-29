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

interface ProjectGroup {
  projectName: string;
  workLogs: WorkLogDto[];
}

interface Section {
  id: string;
  title: string;
  projectGroups: ProjectGroup[];
  emptyRows?: number;
}

function groupWorkLogsByProject(workLogs: WorkLogDto[]): ProjectGroup[] {
  const map = new Map<string, WorkLogDto[]>();
  for (const wl of workLogs) {
    const key = wl.projectName || '(Không có dự án)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(wl);
  }
  return Array.from(map.entries()).map(([name, logs]) => ({
    projectName: name,
    workLogs: logs,
  }));
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
    // Row 2: Title
    ws.mergeCells('A2:G2');
    ws.getCell('A2').value =
      `BÁO CÁO CÔNG VIỆC THÁNG ${options.month}.${options.year}`;
    ws.getCell('A2').font = FONT;
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Name
    ws.getCell('C3').value = `Họ và Tên: ${options.employeeName}`;
    ws.getCell('C3').font = FONT;
    ws.getCell('C3').alignment = CENTER;

    // Row 4: Department
    ws.getCell('C4').value = `Bộ phận: ${department}`;
    ws.getCell('C4').font = FONT;
    ws.getCell('C4').alignment = CENTER;

    // Row 5: empty

    // Row 6-7: Header
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
    let stt = 1;

    const nextMonth = options.month === 12 ? 1 : options.month + 1;

    const sections: Section[] = [
      {
        id: 'I',
        title: 'Công việc chung',
        projectGroups: groupWorkLogsByProject(workLogs),
      },
      {
        id: 'II',
        title: 'Hỗ trợ phòng ban khác',
        projectGroups: [],
        emptyRows: 5,
      },
      {
        id: 'III',
        title: `Kế hoạch tháng ${nextMonth}`,
        projectGroups: [],
        emptyRows: 5,
      },
    ];

    for (const section of sections) {
      // Section header row
      ws.getCell(rowIdx, 1).value = section.id;
      ws.mergeCells(rowIdx, 2, rowIdx, 7);
      ws.getCell(rowIdx, 2).value = section.title;
      applyRowStyle(ws, rowIdx, { bold: true, fill: SECTION_FILL });
      rowIdx++;

      // Section I: group by project
      if (section.projectGroups.length > 0) {
        for (const group of section.projectGroups) {
          const startRow = rowIdx;

          for (let di = 0; di < group.workLogs.length; di++) {
            const wl = group.workLogs[di];

            // Col A: STT
            ws.getCell(rowIdx, 1).value = di === 0 ? stt : '';
            // Col B: empty
            ws.getCell(rowIdx, 2).value = '';
            // Col C: KẾ HOẠCH — project name (first row only)
            ws.getCell(rowIdx, 3).value = di === 0 ? group.projectName : '';
            // Col D: THỰC HIỆN — work log content + date
            ws.getCell(rowIdx, 4).value = `[${wl.executionDate?.substring(0, 10)}] ${wl.content}`;
            // Col E-G: empty
            ws.getCell(rowIdx, 5).value = '';
            ws.getCell(rowIdx, 6).value = '';
            ws.getCell(rowIdx, 7).value = '';

            applyRowStyle(ws, rowIdx);
            rowIdx++;
          }

          // Merge STT + plan cells if multiple work logs
          if (group.workLogs.length > 1) {
            ws.mergeCells(startRow, 1, rowIdx - 1, 1);
            ws.mergeCells(startRow, 3, rowIdx - 1, 3);
          }

          // 1 empty row between projects
          applyRowStyle(ws, rowIdx);
          rowIdx++;
          stt++;
        }
      }

      // Empty rows for sections II and III
      if (section.emptyRows) {
        for (let i = 0; i < section.emptyRows; i++) {
          ws.getCell(rowIdx, 1).value = '';
          ws.getCell(rowIdx, 2).value = '';
          ws.getCell(rowIdx, 3).value = '';
          ws.getCell(rowIdx, 4).value = '';
          ws.getCell(rowIdx, 5).value = '';
          ws.getCell(rowIdx, 6).value = '';
          ws.getCell(rowIdx, 7).value = '';
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
