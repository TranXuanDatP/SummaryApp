import {
  Controller,
  Get,
  Post,
  Patch,
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
  CreateUserCommand,
  DeactivateUserCommand,
  GetUserQuery,
  GetUserListQuery,
} from '../../application';
import { CreateUserDto, UserDto } from '../../application/dtos';

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

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<UserDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.password,
      dto.fullName,
      dto.role,
    );

    const result = await this.commandBus.execute<CreateUserCommand, UserDto>(
      command,
    );
    res.header('Location', `/users/${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: UserDto[]; total: number; page: number; totalPages: number }> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetUserListQuery(p, l);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getById(@Param('id') id: string): Promise<UserDto> {
    const query = new GetUserQuery(id);
    return this.queryBus.execute(query);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(@Param('id') id: string): Promise<UserDto> {
    const command = new DeactivateUserCommand(id);
    return this.commandBus.execute<DeactivateUserCommand, UserDto>(command);
  }
}
