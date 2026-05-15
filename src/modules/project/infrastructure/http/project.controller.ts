import {
  Controller,
  Get,
  Post,
  Put,
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
  GetProjectQuery,
  GetProjectListQuery,
  SearchProjectsQuery,
} from '../../application';
import { CreateProjectDto, UpdateProjectDto, MergeProjectsDto, ProjectDto } from '../../application/dtos';
import { Roles, CurrentUser } from '@modules/auth/infrastructure/http/decorators';

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
@Controller('projects')
export class ProjectController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Project name already exists' })
  async create(
    @Body() dto: CreateProjectDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ProjectDto> {
    const command = new CreateProjectCommand(dto.name, dto.description ?? null);

    const result = await this.commandBus.execute<CreateProjectCommand, ProjectDto>(command);
    res.header('Location', `/projects/${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiResponse({ status: 200, description: 'Paginated project list' })
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: ProjectDto[]; total: number; page: number; totalPages: number }> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetProjectListQuery(p, l);
    return this.queryBus.execute(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search projects by name' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: ProjectDto[]; total: number; page: number; totalPages: number }> {
    if (!q || q.trim().length === 0) {
      return { data: [], total: 0, page: 1, totalPages: 0 };
    }
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new SearchProjectsQuery(q.trim(), p, l);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getById(@Param('id') id: string): Promise<ProjectDto> {
    const query = new GetProjectQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const command = new UpdateProjectCommand(id, dto.name, dto.description !== undefined ? dto.description : undefined);
    return this.commandBus.execute<UpdateProjectCommand, ProjectDto>(command);
  }

  @Post(':id/merge')
  @Roles('manager')
  @ApiOperation({ summary: 'Merge projects' })
  async merge(
    @Param('id') id: string,
    @Body() dto: MergeProjectsDto,
    @CurrentUser() user: any,
  ): Promise<ProjectDto> {
    const command = new MergeProjectsCommand(id, dto.sourceIds, user?.id ?? 'unknown');
    return this.commandBus.execute<MergeProjectsCommand, ProjectDto>(command);
  }
}
