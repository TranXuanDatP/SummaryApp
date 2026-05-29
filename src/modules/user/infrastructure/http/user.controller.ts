import {
  Controller,
  Get,
  Post,
  Patch,
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
  CreateUserCommand,
  DeactivateUserCommand,
  DeleteUserCommand,
  GetUserQuery,
  GetUserListQuery,
  GetEmployeeListQuery,
} from '../../application';
import { CreateUserDto, UserDto } from '../../application/dtos';
import { Roles } from '@modules/auth/infrastructure/http/decorators';
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

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  @AuditLog('user.create', 'User')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo người dùng' })
  @ApiResponse({ status: 201, description: 'Tạo người dùng thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi xác thực dữ liệu' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
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
  @ApiOperation({ summary: 'Danh sách người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng (phân trang)' })
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: UserDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetUserListQuery(p, l);
    return this.queryBus.execute(query);
  }

  @Get('employees')
  @Roles('manager')
  @ApiOperation({ summary: 'Danh sách nhân viên với thống kê tháng (chỉ manager)' })
  @ApiQuery({ name: 'month', required: false, description: 'Tháng (1-12)' })
  @ApiQuery({ name: 'year', required: false, description: 'Year' })
  @ApiResponse({ status: 200, description: 'Danh sách nhân viên kèm thống kê' })
  async getEmployeeList(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<import('../../application/dtos').EmployeeListItemDto[]> {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const query = new GetEmployeeListQuery(m, y);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết người dùng' })
  @ApiParam({ name: 'id', description: 'ID Người dùng' })
  @ApiResponse({ status: 200, description: 'Tìm thấy người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async getById(@Param('id') id: string): Promise<UserDto> {
    const query = new GetUserQuery(id);
    return this.queryBus.execute(query);
  }

  @Patch(':id/deactivate')
  @AuditLog('user.deactivate', 'User')
  @ApiOperation({ summary: 'Vô hiệu hóa người dùng' })
  @ApiParam({ name: 'id', description: 'ID Người dùng' })
  @ApiResponse({ status: 200, description: 'Đã vô hiệu hóa người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async deactivate(@Param('id') id: string): Promise<UserDto> {
    const command = new DeactivateUserCommand(id);
    return this.commandBus.execute<DeactivateUserCommand, UserDto>(command);
  }

  @Delete(':id')
  @Roles('manager')
  @AuditLog('user.delete', 'User')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa người dùng — soft delete (chỉ manager)' })
  @ApiParam({ name: 'id', description: 'ID Người dùng' })
  @ApiResponse({ status: 200, description: 'Đã xóa người dùng' })
  @ApiResponse({
    status: 403,
    description: 'Cấm — cần vai trò manager',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async delete(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    const command = new DeleteUserCommand(id);
    return this.commandBus.execute<
      DeleteUserCommand,
      { deleted: boolean; id: string }
    >(command);
  }
}
