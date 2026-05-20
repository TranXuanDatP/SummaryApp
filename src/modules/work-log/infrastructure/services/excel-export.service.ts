import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { Worksheet } from 'exceljs';
import type { WorkLogDto } from '../../application/dtos';

export interface IExcelExportService {
  generateMonthlyReport(
    workLogs: WorkLogDto[],
    options: { employeeName: string; month: number; year: number },
  ): Promise<Buffer>;
}

const FONT_NAME = 'Times New Roman';

const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFC6E0B4' },
};

const SECTION_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFA9D08E' },
};

const HEADER_FONT = { bold: true, size: 11, name: FONT_NAME };
const SECTION_FONT = { bold: true, size: 11, name: FONT_NAME };
const NORMAL_FONT = { size: 11, name: FONT_NAME };

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  diagonal: { style: 'thin' as const, color: { argb: 'FF000000' } },
};

const CENTER_ALIGN = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
const WRAP_ALIGN = { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true };

const HEADERS = [
  'STT',
  'TÊN SẢN PHẨM/ DỰ ÁN',
  'THỜI GIAN (TUẦN)',
  'KẾ HOẠCH ĐẶT RA',
  'THỰC HIỆN',
  'KẾT QUẢ : %',
  'Ý KIẾN ĐỀ XUẤT',
  'GHI CHÚ',
];

interface AggregatedRow {
  projectName: string;
  projectId: string;
  week: number;
  content: string;
}

function calcWeekOfMonth(executionDate: string): number {
  const d = new Date(executionDate);
  const day = d.getUTCDate();
  return Math.floor((day - 1) / 7) + 1;
}

function aggregateWorkLogs(workLogs: WorkLogDto[]): AggregatedRow[] {
  const groups = new Map<string, { projectName: string; projectId: string; week: number; contents: Set<string> }>();

  for (const wl of workLogs) {
    if (!wl.content) continue;
    const week = calcWeekOfMonth(wl.executionDate);
    const key = `${wl.projectId}_${week}`;
    if (!groups.has(key)) {
      groups.set(key, { projectName: wl.projectName || 'Unknown', projectId: wl.projectId, week, contents: new Set<string>() });
    }
    groups.get(key)!.contents.add(`- ${wl.content}`);
  }

  return Array.from(groups.values())
    .sort((a, b) => a.projectName.localeCompare(b.projectName) || a.week - b.week)
    .map((g) => ({
      projectName: g.projectName,
      projectId: g.projectId,
      week: g.week,
      content: Array.from(g.contents).join('\n'),
    }));
}

function autoWidth(ws: Worksheet, col: number, minW: number, maxW: number, dataRows: Set<number>) {
  let best = minW;
  for (const row of dataRows) {
    if (row > ws.rowCount) break;
    const cell = ws.getCell(row, col);
    if (cell.value) {
      const longest = String(cell.value)
        .split('\n')
        .reduce((max, line) => Math.max(max, line.length), 0);
      best = Math.max(best, longest);
    }
  }
  ws.getColumn(col).width = Math.min(best + 5, maxW);
}

@Injectable()
export class ExcelExportService implements IExcelExportService {
  async generateMonthlyReport(
    workLogs: WorkLogDto[],
    options: { employeeName: string; month: number; year: number },
  ): Promise<Buffer> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Báo cáo tháng');

    // Row 4: "Bộ phận: IT" merged C4:H4, centered
    ws.getCell('C4').value = 'Bộ phận: IT';
    ws.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('C4').font = NORMAL_FONT;
    ws.mergeCells('C4:H4');

    // Row 6: Header row
    for (let i = 0; i < HEADERS.length; i++) {
      const cell = ws.getCell(6, i + 1);
      cell.value = HEADERS[i];
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = CENTER_ALIGN;
      cell.border = THIN_BORDER;
    }

    if (workLogs.length === 0) {
      this.setColumnWidths(ws);
      const buffer = await wb.xlsx.writeBuffer();
      return Buffer.from(buffer);
    }

    const aggregated = aggregateWorkLogs(workLogs);
    let rowIdx = 7;
    let sectionNum = 1;
    let prevProjectId: string | null = null;
    const dataRows = new Set<number>();

    for (const row of aggregated) {
      // Section row for new project
      if (row.projectId !== prevProjectId) {
        prevProjectId = row.projectId;

        const sttCell = ws.getCell(rowIdx, 1);
        sttCell.value = sectionNum;
        sttCell.fill = SECTION_FILL;
        sttCell.font = SECTION_FONT;
        sttCell.alignment = CENTER_ALIGN;
        sttCell.border = THIN_BORDER;

        ws.mergeCells(rowIdx, 2, rowIdx, 8);
        const nameCell = ws.getCell(rowIdx, 2);
        nameCell.value = row.projectName;
        nameCell.fill = SECTION_FILL;
        nameCell.font = SECTION_FONT;
        nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        nameCell.border = THIN_BORDER;

        // Apply section fill and border to merged cells
        for (let col = 3; col <= 8; col++) {
          const c = ws.getCell(rowIdx, col);
          c.fill = SECTION_FILL;
          c.border = THIN_BORDER;
        }

        sectionNum++;
        rowIdx++;
      }

      // Data row
      const dataValues = [
        '',
        row.projectName,
        `Tuần ${row.week}`,
        '',
        row.content,
        '',
        '',
        '',
      ];

      for (let col = 0; col < dataValues.length; col++) {
        const cell = ws.getCell(rowIdx, col + 1);
        cell.value = dataValues[col];
        cell.font = NORMAL_FONT;
        cell.border = THIN_BORDER;
        if (col === 0 || col === 2 || col === 5) {
          cell.alignment = CENTER_ALIGN;
        } else {
          cell.alignment = WRAP_ALIGN;
        }
      }

      dataRows.add(rowIdx);
      rowIdx++;
    }

    this.setColumnWidths(ws, dataRows);
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private setColumnWidths(ws: Worksheet, dataRows?: Set<number>) {
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 25;
    ws.getColumn(3).width = 18;
    ws.getColumn(6).width = 15;
    ws.getColumn(7).width = 20;
    const rows = dataRows ?? new Set<number>();
    autoWidth(ws, 4, 30, 45, rows);
    autoWidth(ws, 5, 40, 60, rows);
    autoWidth(ws, 8, 20, 35, rows);
  }
}
