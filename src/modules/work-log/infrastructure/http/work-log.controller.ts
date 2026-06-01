import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from 'src/libs/core';
import {
  CreateWorkLogCommand,
  UpdateWorkLogCommand,
  DeleteWorkLogCommand,
  UnlockWorkLogCommand,
  UpdateWorkLogStatusCommand,
} from '../../application/commands';
import {
  GetWorkLogsQuery,
  GetWorkLogDefaultsQuery,
  GetCalendarViewQuery,
  GetSummaryViewQuery,
} from '../../application/queries';
import {
  CreateWorkLogDto,
  UpdateWorkLogDto,
  UnlockWorkLogDto,
  UpdateWorkLogStatusDto,
  WorkLogDto,
  WorkLogDefaultsDto,
  CalendarDayDto,
  SummaryViewDto,
} from '../../application/dtos';
import {
  CurrentUser,
  Roles,
} from '@modules/auth/infrastructure/http/decorators';
import { ValidationException } from 'src/libs/core/common';
import { AuditLog } from 'src/libs/shared';

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

type PaginatedWorkLogResponse = {
  data: WorkLogDto[];
  total: number;
  page: number;
  totalPages: number;
};

@ApiTags('work-logs')
@ApiBearerAuth('JWT-auth')
@Controller('work-logs')
export class WorkLogController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Get('calendar')
  @ApiOperation({ summary: 'Xem lịch tháng' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (vd: 2026)' })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Chỉ Manager: xem nhân viên khác',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu lịch theo ngày' })
  @ApiResponse({ status: 400, description: 'Thiếu tháng/năm' })
  async getCalendar(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<CalendarDayDto[]> {
    if (!month || !year) {
      throw new ValidationException('month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      throw new ValidationException('Invalid month or year');
    }
    const targetEmployeeId =
      user.role === 'manager' ? employeeId || user.userId : user.userId;
    const query = new GetCalendarViewQuery(targetEmployeeId, m, y);
    return this.queryBus.execute(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Xem tổng hợp tháng' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (vd: 2026)' })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Chỉ Manager: xem nhân viên khác',
  })
  @ApiResponse({ status: 200, description: 'Thống kê tổng hợp' })
  @ApiResponse({ status: 400, description: 'Thiếu tháng/năm' })
  async getSummary(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<SummaryViewDto> {
    if (!month || !year) {
      throw new ValidationException('month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      throw new ValidationException('Invalid month or year');
    }
    const targetEmployeeId =
      user.role === 'manager' ? employeeId || user.userId : user.userId;
    const query = new GetSummaryViewQuery(targetEmployeeId, m, y);
    return this.queryBus.execute(query);
  }

  @Get('defaults')
  @ApiOperation({ summary: 'Lấy giá trị mặc định khi tạo báo cáo công việc' })
  @ApiResponse({ status: 200, description: 'Giá trị mặc định' })
  async getDefaults(@CurrentUser() user: any): Promise<WorkLogDefaultsDto> {
    const query = new GetWorkLogDefaultsQuery(user.userId);
    return this.queryBus.execute(query);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách báo cáo công việc' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'executionDate', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'all', required: false, description: 'Manager: đặt true để xem tất cả' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Danh sách báo cáo CV (phân trang)' })
  async getList(
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string,
    @Query('executionDate') executionDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('all') all?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedWorkLogResponse> {
    const { page: p, limit: l } = parsePagination(page, limit);
    let targetEmployeeId: string | undefined;
    if (user.role === 'manager') {
      if (employeeId) {
        targetEmployeeId = employeeId;
      } else if (all === 'true') {
        targetEmployeeId = undefined;
      } else {
        targetEmployeeId = user.userId;
      }
    } else {
      targetEmployeeId = user.userId;
    }
    const query = new GetWorkLogsQuery(
      targetEmployeeId,
      projectId || undefined,
      executionDate ? new Date(executionDate) : undefined,
      p,
      l,
      user.role,
    );
    return this.queryBus.execute(query);
  }

  @Post()
  @AuditLog('work-log.create', 'WorkLog')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo báo cáo công việc' })
  @ApiResponse({ status: 201, description: 'Tạo báo cáo CV thành công' })
  @ApiResponse({ status: 422, description: 'Vi phạm quy tắc nghiệp vụ' })
  @ApiResponse({ status: 409, description: 'Báo cáo CV trùng lặp' })
  async create(
    @Body() dto: CreateWorkLogDto,
    @CurrentUser() user: any,
  ): Promise<WorkLogDto> {
    const executionDate = dto.executionDate
      ? new Date(dto.executionDate)
      : null;
    const command = new CreateWorkLogCommand(
      dto.content,
      dto.projectId ?? null,
      user.userId,
      executionDate,
      dto.sprintId ?? null,
      (dto.workType as any) ?? null,
    );
    return this.commandBus.execute<
      CreateWorkLogCommand,
      WorkLogDto
    >(command);
  }

  @Put(':id')
  @AuditLog('work-log.update', 'WorkLog')
  @ApiOperation({ summary: 'Cập nhật báo cáo công việc' })
  @ApiParam({ name: 'id', description: 'ID Báo cáo CV' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật báo cáo CV' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy báo cáo CV' })
  @ApiResponse({ status: 422, description: 'Báo cáo CV đã bị khóa' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkLogDto,
    @CurrentUser() user: any,
  ): Promise<WorkLogDto> {
    const command = new UpdateWorkLogCommand(id, dto.content, user.userId, dto.sprintId, (dto.workType as any) ?? undefined);
    return this.commandBus.execute<UpdateWorkLogCommand, WorkLogDto>(command);
  }

  @Delete(':id')
  @AuditLog('work-log.delete', 'WorkLog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa báo cáo công việc' })
  @ApiParam({ name: 'id', description: 'ID Báo cáo CV' })
  @ApiResponse({ status: 200, description: 'Đã xóa báo cáo CV' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy báo cáo CV' })
  @ApiResponse({ status: 422, description: 'Báo cáo CV đã bị khóa' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ deleted: boolean; id: string }> {
    const command = new DeleteWorkLogCommand(id, user.userId, user.role);
    return this.commandBus.execute<
      DeleteWorkLogCommand,
      { deleted: boolean; id: string }
    >(command);
  }

  @Patch(':id/status')
  @AuditLog('work-log.update-status', 'WorkLog')
  @ApiOperation({ summary: 'Cập nhật trạng thái công việc (in_progress/done)' })
  @ApiParam({ name: 'id', description: 'ID Báo cáo CV' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái' })
  @ApiResponse({ status: 403, description: 'Không phải chủ sở hữu' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy báo cáo CV' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWorkLogStatusDto,
    @CurrentUser() user: any,
  ): Promise<WorkLogDto> {
    const command = new UpdateWorkLogStatusCommand(id, dto.status, user.userId);
    return this.commandBus.execute<UpdateWorkLogStatusCommand, WorkLogDto>(command);
  }

  @Post(':id/unlock')
  @AuditLog('work-log.unlock', 'WorkLog')
  @HttpCode(HttpStatus.OK)
  @Roles('manager')
  @ApiOperation({ summary: 'Mở khóa báo cáo công việc (chỉ manager)' })
  @ApiParam({ name: 'id', description: 'ID Báo cáo CV' })
  @ApiResponse({ status: 200, description: 'Đã mở khóa báo cáo CV' })
  @ApiResponse({
    status: 403,
    description: 'Cấm — cần vai trò manager',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy báo cáo CV' })
  @ApiResponse({ status: 422, description: 'WorkLog deleted or locked' })
  async unlock(
    @Param('id') id: string,
    @Body() dto: UnlockWorkLogDto,
    @CurrentUser() user: any,
  ): Promise<WorkLogDto> {
    const command = new UnlockWorkLogCommand(id, dto.reason, user.userId);
    return this.commandBus.execute<UnlockWorkLogCommand, WorkLogDto>(command);
  }
}
