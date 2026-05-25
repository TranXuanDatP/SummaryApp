import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import {
  UnauthorizedException,
  ForbiddenException,
} from 'src/libs/core/common';
import { RefreshTokenCommand } from '../refresh-token.command';
import { RefreshTokenResponseDto } from '../../dtos';
import type { IUserRepository } from '@modules/user/domain/repositories';
import { USER_REPOSITORY_TOKEN } from '@modules/user/constants/tokens';
import {
  AUTH_JWT_SERVICE_TOKEN,
  AUTH_REFRESH_TOKEN_REPO_TOKEN,
} from '../../../constants/tokens';
import type { IJwtTokenService } from '../../../domain/services/jwt-token.interface';
import type { IRefreshTokenRepository } from '../../../domain/repositories/i-refresh-token-repository.interface';
import { hashToken } from '../../../domain/services/token-hash.util';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<
  RefreshTokenCommand,
  RefreshTokenResponseDto
> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(AUTH_JWT_SERVICE_TOKEN)
    private readonly jwtTokenService: IJwtTokenService,
    @Inject(AUTH_REFRESH_TOKEN_REPO_TOKEN)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(
    command: RefreshTokenCommand,
  ): Promise<RefreshTokenResponseDto> {
    const tokenHash = hashToken(command.refreshToken);

    // Atomically find and revoke — prevents concurrent reuse (race condition fix)
    const tokenRecord =
      await this.refreshTokenRepo.findAndRevokeByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        'AUTH_REFRESH_EXPIRED',
        { suggestion: 'Vui lòng đăng nhập lại' },
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        'AUTH_REFRESH_EXPIRED',
        { suggestion: 'Vui lòng đăng nhập lại' },
      );
    }

    const user = await this.userRepository.getById(tokenRecord.userId);

    if (!user || !user.isActive) {
      await this.refreshTokenRepo.revokeAllForUser(tokenRecord.userId);
      throw new ForbiddenException(
        'Tài khoản đã bị vô hiệu hóa',
        'AUTH_ACCOUNT_DISABLED',
        { suggestion: 'Liên hệ quản trị viên' },
      );
    }

    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role.value,
    });

    const newRefreshToken = await this.jwtTokenService.generateRefreshToken();

    await this.refreshTokenRepo.save({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
    });

    return new RefreshTokenResponseDto({
      accessToken,
      refreshToken: newRefreshToken,
    });
  }
}
