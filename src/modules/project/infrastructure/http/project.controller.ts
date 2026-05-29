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
  ApiBearerAuth, // <--- Đã thêm import ở đây
} from '@nestjs/swagger';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from 'src/libs/core';
import {
  CreateProjectCommand,
  UpdateProjectCommand,
  MergeProjectsCommand,
  DeleteProjectCommand,
  GetProjectQuery,
  GetProjectListQuery,
  SearchProjectsQuery,
} from '../../application';
import {
  CreateProjectDto,
  UpdateProjectDto,
  MergeProjectsDto,
  ProjectDto,
} from '../../application/dtos';
import {
  Roles,
  CurrentUser,
} from '@modules/auth/infrastructure/http/decorators';
import { AuditLog } from 'src/libs/shared';

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function parsePagination(page?: string, limit?: string) {
  let p = page ? parseInt(page, 10) : DEFAULT_PAGE;
  let l = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;

  if (isNaN(p) || p < 1) p = DEFAULT_PAGE;
  if (isNaN(l) || l < 1) l = DEFAULT_LIMIT;
  if (l > MAX_PAGE_LIMIT) l = MAX_PAGE_LIMIT;

  return { page: p, limit: l };
}

@ApiTags('projects')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
export class ProjectController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  @AuditLog('project.create', 'Project')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo dự án' })
  @ApiResponse({ status: 201, description: 'Tạo dự án thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi xác thực dữ liệu' })
  @ApiResponse({ status: 409, description: 'Tên dự án đã tồn tại' })
  async create(
    @Body() dto: CreateProjectDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ProjectDto> {
    const command = new CreateProjectCommand(dto.name, dto.description ?? null);

    const result = await this.commandBus.execute<
      CreateProjectCommand,
      ProjectDto
    >(command);
    res.header('Location', `/projects/${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách dự án' })
  @ApiResponse({ status: 200, description: 'Danh sách dự án (phân trang)' })
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: ProjectDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetProjectListQuery(p, l);
    return this.queryBus.execute(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm dự án theo tên' })
  @ApiResponse({ status: 200, description: 'Kết quả tìm kiếm' })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: ProjectDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (!q || q.trim().length === 0) {
      return { data: [], total: 0, page: 1, totalPages: 0 };
    }
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new SearchProjectsQuery(q.trim(), p, l);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết dự án' })
  @ApiParam({ name: 'id', description: 'ID Dự án' })
  @ApiResponse({ status: 200, description: 'Tìm thấy dự án' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dự án' })
  async getById(@Param('id') id: string): Promise<ProjectDto> {
    const query = new GetProjectQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @AuditLog('project.update', 'Project')
  @ApiOperation({ summary: 'Cập nhật dự án' })
  @ApiParam({ name: 'id', description: 'ID Dự án' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật dự án' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dự án' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const command = new UpdateProjectCommand(
      id,
      dto.name,
      dto.description !== undefined ? dto.description : undefined,
    );
    return this.commandBus.execute<UpdateProjectCommand, ProjectDto>(command);
  }

  @Post(':id/merge')
  @AuditLog('project.merge', 'Project')
  @Roles('manager')
  @ApiOperation({ summary: 'Gộp dự án' })
  async merge(
    @Param('id') id: string,
    @Body() dto: MergeProjectsDto,
    @CurrentUser() user: any,
  ): Promise<ProjectDto> {
    const command = new MergeProjectsCommand(
      id,
      dto.sourceIds,
      user?.id ?? 'unknown',
    );
    return this.commandBus.execute<MergeProjectsCommand, ProjectDto>(command);
  }

  @Delete(':id')
  @Roles('manager')
  @AuditLog('project.delete', 'Project')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa dự án và cascade soft-delete work logs (chỉ manager)',
  })
  @ApiParam({ name: 'id', description: 'ID Dự án' })
  @ApiResponse({ status: 200, description: 'Đã xóa dự án' })
  @ApiResponse({
    status: 403,
    description: 'Cấm — cần vai trò manager',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dự án' })
  async delete(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean; id: string; workLogsDeleted: number }> {
    const command = new DeleteProjectCommand(id);
    return this.commandBus.execute<
      DeleteProjectCommand,
      { deleted: boolean; id: string; workLogsDeleted: number }
    >(command);
  }
}
