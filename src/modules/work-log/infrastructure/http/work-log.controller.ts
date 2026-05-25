import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
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
  @ApiOperation({ summary: 'Get calendar view for a month' })
  @ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Manager only: view another employee',
  })
  @ApiResponse({ status: 200, description: 'Calendar day array' })
  @ApiResponse({ status: 400, description: 'Missing month/year' })
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
  @ApiOperation({ summary: 'Get summary view for a month' })
  @ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Manager only: view another employee',
  })
  @ApiResponse({ status: 200, description: 'Summary statistics' })
  @ApiResponse({ status: 400, description: 'Missing month/year' })
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
  @ApiOperation({ summary: 'Get smart defaults for creating a work log' })
  @ApiResponse({ status: 200, description: 'Default values returned' })
  async getDefaults(@CurrentUser() user: any): Promise<WorkLogDefaultsDto> {
    const query = new GetWorkLogDefaultsQuery(user.userId);
    return this.queryBus.execute(query);
  }

  @Get()
  @ApiOperation({ summary: 'List work logs' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'executionDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated work log list' })
  async getList(
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string,
    @Query('executionDate') executionDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedWorkLogResponse> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetWorkLogsQuery(
      user.role === 'employee' ? user.userId : undefined,
      projectId || undefined,
      executionDate ? new Date(executionDate) : undefined,
      p,
      l,
      user.role,
    );
    return this.queryBus.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create work log' })
  @ApiResponse({ status: 201, description: 'WorkLog created successfully' })
  @ApiResponse({ status: 422, description: 'Business rule violation' })
  @ApiResponse({ status: 409, description: 'Duplicate WorkLog' })
  async create(
    @Body() dto: CreateWorkLogDto,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<WorkLogDto> {
    const executionDate = dto.executionDate
      ? new Date(dto.executionDate)
      : null;
    const command = new CreateWorkLogCommand(
      dto.content,
      dto.projectId ?? null,
      user.userId,
      executionDate,
    );
    const result = await this.commandBus.execute<
      CreateWorkLogCommand,
      WorkLogDto
    >(command);
    res.header('Location', `/work-logs/${result.id}`);
    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update work log' })
  @ApiParam({ name: 'id', description: 'WorkLog ID' })
  @ApiResponse({ status: 200, description: 'WorkLog updated' })
  @ApiResponse({ status: 404, description: 'WorkLog not found' })
  @ApiResponse({ status: 422, description: 'WorkLog locked' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkLogDto,
    @CurrentUser() user: any,
  ): Promise<WorkLogDto> {
    const command = new UpdateWorkLogCommand(id, dto.content, user.userId);
    return this.commandBus.execute<UpdateWorkLogCommand, WorkLogDto>(command);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete work log' })
  @ApiParam({ name: 'id', description: 'WorkLog ID' })
  @ApiResponse({ status: 200, description: 'WorkLog deleted' })
  @ApiResponse({ status: 404, description: 'WorkLog not found' })
  @ApiResponse({ status: 422, description: 'WorkLog locked' })
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

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @Roles('manager')
  @ApiOperation({ summary: 'Unlock a locked work log (manager only)' })
  @ApiParam({ name: 'id', description: 'WorkLog ID' })
  @ApiResponse({ status: 200, description: 'WorkLog unlocked' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — manager role required',
  })
  @ApiResponse({ status: 404, description: 'WorkLog not found' })
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
