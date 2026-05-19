import {
  Controller,
  Get,
  Query,
  Inject,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { type IQueryBus, QUERY_BUS_TOKEN } from 'src/libs/core';
import { GetMonthlyReportQuery } from '../../application/queries';
import { MonthlyReportEntryDto } from '../../application/dtos';
import { CurrentUser } from '@modules/auth/infrastructure/http/decorators';
import { ValidationException } from 'src/libs/core/common';
import { WORK_LOG_READ_DAO_TOKEN, EXCEL_EXPORT_SERVICE_TOKEN } from '../../constants/tokens';
import type { IWorkLogReadDao } from '../../application/queries/ports';
import type { IExcelExportService } from '../services';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
  let p = page ? parseInt(page, 10) : DEFAULT_PAGE;
  let l = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
  if (isNaN(p) || p < 1) p = DEFAULT_PAGE;
  if (isNaN(l) || l < 1) l = DEFAULT_LIMIT;
  if (l > MAX_PAGE_LIMIT) l = MAX_PAGE_LIMIT;
  return { page: p, limit: l };
}

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportController {
  constructor(
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
    @Inject(WORK_LOG_READ_DAO_TOKEN) private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(EXCEL_EXPORT_SERVICE_TOKEN) private readonly excelExportService: IExcelExportService,
  ) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly report' })
  @ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Monthly report data' })
  @ApiResponse({ status: 400, description: 'Missing month/year' })
  async getMonthlyReport(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: MonthlyReportEntryDto[]; total: number; page: number; totalPages: number }> {
    if (!month || !year) {
      throw new ValidationException('month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      throw new ValidationException('Invalid month or year');
    }

    const { page: p, limit: l } = parsePagination(page, limit);

    const targetEmployeeId = user.role === 'manager' ? (employeeId || undefined) : user.userId;
    const targetProjectId = projectId || undefined;

    const query = new GetMonthlyReportQuery(m, y, targetEmployeeId, targetProjectId, p, l, user.role);
    return this.queryBus.execute(query);
  }

  @Get('monthly/export')
  @ApiOperation({ summary: 'Export monthly report as Excel' })
  @ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  @ApiResponse({ status: 400, description: 'Missing month/year' })
  async exportMonthlyReport(
    @CurrentUser() user: any,
    @Res() res: FastifyReply,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<void> {
    if (!month || !year) {
      throw new ValidationException('month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      throw new ValidationException('Invalid month or year');
    }

    const targetEmployeeId = user.role === 'manager' ? (employeeId || undefined) : user.userId;
    const targetProjectId = projectId || undefined;

    const { data: workLogs } = await this.workLogReadDao.findMonthlyReport({
      month: m,
      year: y,
      employeeId: targetEmployeeId,
      projectId: targetProjectId,
      page: 1,
      limit: 100000,
    });

    const employeeName = workLogs[0]?.employeeName || 'All';

    const buffer = await this.excelExportService.generateMonthlyReport(
      workLogs,
      { employeeName, month: m, year: y },
    );

    const filename = `BaoCao_Thang${String(m).padStart(2, '0')}_${y}_${employeeName}.xlsx`;

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
