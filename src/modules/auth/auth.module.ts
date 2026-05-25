import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { SharedCqrsModule } from 'src/libs/shared';
import { AuthController } from './infrastructure/http';
import { JwtTokenService } from './infrastructure/services';
import { RefreshTokenRepository } from './infrastructure/persistence/write';
import { TokenReadDao } from './infrastructure/persistence/read';
import { JwtAuthGuard, RolesGuard } from './infrastructure/http/guards';
import { JwtStrategy } from './infrastructure/http/strategies';
import { CommandHandlers } from './application/commands/handlers';
import {
  AUTH_JWT_SERVICE_TOKEN,
  AUTH_REFRESH_TOKEN_REPO_TOKEN,
  AUTH_TOKEN_READ_DAO_TOKEN,
} from './constants/tokens';

@Module({
  imports: [
    UserModule,
    SharedCqrsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // JWT Strategy
    JwtStrategy,

    // Guards
    JwtAuthGuard,
    RolesGuard,

    // JWT Token Service
    JwtTokenService,
    { provide: AUTH_JWT_SERVICE_TOKEN, useExisting: JwtTokenService },

    // Refresh Token Repository
    RefreshTokenRepository,
    {
      provide: AUTH_REFRESH_TOKEN_REPO_TOKEN,
      useExisting: RefreshTokenRepository,
    },

    // Read DAO
    TokenReadDao,
    { provide: AUTH_TOKEN_READ_DAO_TOKEN, useExisting: TokenReadDao },

    // Command Handlers
    ...CommandHandlers,
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
