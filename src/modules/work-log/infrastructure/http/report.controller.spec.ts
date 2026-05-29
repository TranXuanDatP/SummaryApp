import { ReportController } from './report.controller';
import { WorkLogDto } from '../../application/dtos/work-log.dto';
import { ValidationException } from 'src/libs/core/common';

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
      status: 'in_progress',
    version: 1,
    isEditable: true,
    editWindowClosesAt: '2026-05-06T00:00:00.000Z',
    projectName: 'Project A',
    employeeName: 'Nguyễn Văn A',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
  };
  return new WorkLogDto({ ...defaults, ...overrides });
}

describe('ReportController', () => {
  let controller: ReportController;
  let mockQueryBus: { execute: jest.Mock };
  let mockReadDao: { findMonthlyReport: jest.Mock };
  let mockExcelService: { generateMonthlyReport: jest.Mock };

  beforeEach(() => {
    mockQueryBus = { execute: jest.fn() };
    mockReadDao = { findMonthlyReport: jest.fn() };
    mockExcelService = { generateMonthlyReport: jest.fn() };
    controller = new ReportController(
      mockQueryBus as any,
      mockReadDao as any,
      mockExcelService as any,
    );
  });

  describe('exportMonthlyReport', () => {
    const mockRes = () => {
      const res: any = {
        headers: {} as Record<string, string>,
        statusCode: 200,
        header(key: string, value: string) {
          res.headers[key] = value;
          return res;
        },
        status(code: number) {
          res.statusCode = code;
          return res;
        },
        send: jest.fn(),
      };
      return res;
    };

    it('should set correct Content-Type header', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog()],
        total: 1,
      });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'emp-1', role: 'employee' } as any,
        res,
        '5',
        '2026',
      );

      expect(res.headers['Content-Type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should set Content-Disposition with filename*=UTF-8 encoding for Vietnamese names', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog()],
        total: 1,
      });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'emp-1', role: 'employee' } as any,
        res,
        '5',
        '2026',
      );

      const disposition = res.headers['Content-Disposition'];
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('filename*=UTF-8');
      expect(disposition).toContain('Nguy%E1%BB%85n');
    });

    it('should use employee name in filename for single-employee export', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog()],
        total: 1,
      });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'emp-1', role: 'employee' } as any,
        res,
        '5',
        '2026',
      );

      const disposition = res.headers['Content-Disposition'];
      expect(disposition).toContain('BaoCao_Thang05_2026');
    });

    it('should use "All" in filename when manager exports without employeeId filter', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog(), makeWorkLog({ employeeName: 'Someone Else' })],
        total: 2,
      });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'mgr-1', role: 'manager' } as any,
        res,
        '5',
        '2026',
        undefined,
      );

      const disposition = res.headers['Content-Disposition'];
      expect(disposition).toContain('BaoCao_Thang05_2026_All');
    });

    it('should use employee name when manager filters by employeeId', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog()],
        total: 1,
      });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'mgr-1', role: 'manager' } as any,
        res,
        '5',
        '2026',
        'emp-1',
      );

      const disposition = res.headers['Content-Disposition'];
      expect(disposition).toContain('Nguy');
    });

    it('should enforce C-7: employee forced to own userId regardless of employeeId param', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'emp-1', role: 'employee' } as any,
        res,
        '5',
        '2026',
        'emp-other',
      );

      expect(mockReadDao.findMonthlyReport).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-1' }),
      );
    });

    it('should allow manager to filter by any employeeId', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({ data: [], total: 0 });
      mockExcelService.generateMonthlyReport.mockResolvedValue(
        Buffer.from('xlsx'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'mgr-1', role: 'manager' } as any,
        res,
        '5',
        '2026',
        'emp-99',
      );

      expect(mockReadDao.findMonthlyReport).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-99' }),
      );
    });

    it('should throw ValidationException when month is missing', async () => {
      await expect(
        controller.exportMonthlyReport(
          { userId: 'emp-1', role: 'employee' } as any,
          mockRes(),
          undefined,
          '2026',
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when year is missing', async () => {
      await expect(
        controller.exportMonthlyReport(
          { userId: 'emp-1', role: 'employee' } as any,
          mockRes(),
          '5',
          undefined,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should return 500 JSON on Excel generation failure', async () => {
      mockReadDao.findMonthlyReport.mockResolvedValue({
        data: [makeWorkLog()],
        total: 1,
      });
      mockExcelService.generateMonthlyReport.mockRejectedValue(
        new Error('OOM'),
      );
      const res = mockRes();

      await controller.exportMonthlyReport(
        { userId: 'emp-1', role: 'employee' } as any,
        res,
        '5',
        '2026',
      );

      expect(res.statusCode).toBe(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 }),
      );
    });
  });
});
