import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from 'src/libs/core';
import {
  CreateSprintCommand,
  UpdateSprintCommand,
  DeleteSprintCommand,
  UpdateSprintStatusCommand,
} from '../../application/commands';
import {
  GetSprintsByProjectQuery,
  GetSprintByIdQuery,
} from '../../application/queries';
import {
  CreateSprintDto,
  UpdateSprintDto,
  UpdateSprintStatusDto,
  SprintDto,
} from '../../application/dtos';
import { AuditLog } from 'src/libs/shared';

@ApiTags('sprints')
@ApiBearerAuth('JWT-auth')
@Controller('sprints')
export class SprintController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Danh sách sprint theo dự án' })
  @ApiParam({ name: 'projectId', description: 'ID Dự án' })
  @ApiResponse({ status: 200, description: 'Danh sách sprint' })
  async getByProject(
    @Param('projectId') projectId: string,
  ): Promise<SprintDto[]> {
    const query = new GetSprintsByProjectQuery(projectId);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sprint' })
  @ApiParam({ name: 'id', description: 'ID Sprint' })
  @ApiResponse({ status: 200, description: 'Thông tin sprint' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sprint' })
  async getById(@Param('id') id: string): Promise<SprintDto> {
    const query = new GetSprintByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Post('project/:projectId')
  @AuditLog('sprint.create', 'Sprint')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo sprint mới' })
  @ApiParam({ name: 'projectId', description: 'ID Dự án' })
  @ApiResponse({ status: 201, description: 'Tạo sprint thành công' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<SprintDto> {
    const command = new CreateSprintCommand(
      projectId,
      dto.name,
      dto.description ?? null,
      dto.startDate ? new Date(dto.startDate) : null,
      dto.endDate ? new Date(dto.endDate) : null,
      dto.sortOrder ?? 0,
    );
    const result = await this.commandBus.execute<
      CreateSprintCommand,
      SprintDto
    >(command);
    res.header('Location', `/sprints/${result.id}`);
    return result;
  }

  @Put(':id')
  @AuditLog('sprint.update', 'Sprint')
  @ApiOperation({ summary: 'Cập nhật sprint' })
  @ApiParam({ name: 'id', description: 'ID Sprint' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật sprint' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sprint' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
  ): Promise<SprintDto> {
    const command = new UpdateSprintCommand(
      id,
      dto.name,
      dto.description !== undefined ? dto.description : undefined,
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : undefined,
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : undefined,
      dto.sortOrder,
    );
    return this.commandBus.execute<UpdateSprintCommand, SprintDto>(command);
  }

  @Patch(':id/status')
  @AuditLog('sprint.update-status', 'Sprint')
  @ApiOperation({ summary: 'Cập nhật trạng thái sprint' })
  @ApiParam({ name: 'id', description: 'ID Sprint' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sprint' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSprintStatusDto,
  ): Promise<SprintDto> {
    const command = new UpdateSprintStatusCommand(id, dto.status);
    return this.commandBus.execute<UpdateSprintStatusCommand, SprintDto>(
      command,
    );
  }

  @Delete(':id')
  @AuditLog('sprint.delete', 'Sprint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa sprint' })
  @ApiParam({ name: 'id', description: 'ID Sprint' })
  @ApiResponse({ status: 200, description: 'Đã xóa sprint' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sprint' })
  async delete(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const command = new DeleteSprintCommand(id);
    return this.commandBus.execute<
      DeleteSprintCommand,
      { deleted: boolean; id: string }
    >(command);
  }
}
