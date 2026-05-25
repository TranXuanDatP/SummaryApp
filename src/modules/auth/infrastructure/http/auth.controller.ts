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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account disabled' })
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    const command = new LoginCommand(dto.email, dto.password);
    return this.commandBus.execute<LoginCommand, LoginResponseDto>(command);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Refresh token expired' })
  @ApiResponse({ status: 403, description: 'Account disabled' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token expired or missing JWT',
  })
  async logout(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<{ success: boolean }> {
    const command = new LogoutCommand(dto.refreshToken);
    await this.commandBus.execute<LogoutCommand, void>(command);
    return { success: true };
  }
}
