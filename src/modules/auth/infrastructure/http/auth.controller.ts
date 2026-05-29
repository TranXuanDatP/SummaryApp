import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type ICommandBus, COMMAND_BUS_TOKEN } from 'src/libs/core';
import {
  LoginCommand,
  RefreshTokenCommand,
  LogoutCommand,
} from '../../application/commands';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from '../../application/dtos';
import { CurrentUser } from './decorators';
import { Public } from './decorators';
import { AuditLog } from 'src/libs/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Public()
  @Post('login')
  @AuditLog('auth.login', 'Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập' })
  @ApiResponse({ status: 403, description: 'Tài khoản bị vô hiệu hóa' })
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    const command = new LoginCommand(dto.email, dto.password);
    return this.commandBus.execute<LoginCommand, LoginResponseDto>(command);
  }

  @Public()
  @Post('refresh')
  @AuditLog('auth.refresh', 'Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token đã hết hạn' })
  @ApiResponse({ status: 403, description: 'Tài khoản bị vô hiệu hóa' })
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    const command = new RefreshTokenCommand(dto.refreshToken);
    return this.commandBus.execute<
      RefreshTokenCommand,
      RefreshTokenResponseDto
    >(command);
  }

  @Post('logout')
  @AuditLog('auth.logout', 'Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất — Thu hồi refresh token' })
  @ApiResponse({ status: 200, description: 'Đã đăng xuất' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token hết hạn hoặc thiếu JWT',
  })
  async logout(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<{ success: boolean }> {
    const command = new LogoutCommand(dto.refreshToken);
    await this.commandBus.execute<LogoutCommand, void>(command);
    return { success: true };
  }
}
