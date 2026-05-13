import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UnauthorizedException } from 'src/libs/core/common';
import { LogoutCommand } from '../logout.command';
import {
  AUTH_REFRESH_TOKEN_REPO_TOKEN,
} from '../../../constants/tokens';
import type { IRefreshTokenRepository } from '../../../domain/repositories/i-refresh-token-repository.interface';
import { hashToken } from '../../../domain/services/token-hash.util';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(AUTH_REFRESH_TOKEN_REPO_TOKEN)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenHash = hashToken(command.refreshToken);

    const tokenRecord =
      await this.refreshTokenRepo.findByTokenHash(tokenHash);

    if (!tokenRecord || tokenRecord.isRevoked) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        'AUTH_REFRESH_EXPIRED',
        { suggestion: 'Vui lòng đăng nhập lại' },
      );
    }

    await this.refreshTokenRepo.revoke(tokenRecord.id);
  }
}
