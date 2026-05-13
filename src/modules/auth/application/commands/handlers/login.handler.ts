import { Inject } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { CommandHandler } from 'src/libs/shared/cqrs';
import {
  UnauthorizedException,
  ForbiddenException,
} from 'src/libs/core/common';
import { LoginCommand } from '../login.command';
import { LoginResponseDto } from '../../dtos';
import type { IUserRepository } from '@modules/user/domain/repositories';
import type { IHashService } from '@modules/user/domain/services/hash.interface';
import {
  USER_REPOSITORY_TOKEN,
  HASH_SERVICE_TOKEN,
} from '@modules/user/constants/tokens';
import {
  AUTH_JWT_SERVICE_TOKEN,
  AUTH_REFRESH_TOKEN_REPO_TOKEN,
} from '../../../constants/tokens';
import type { IJwtTokenService } from '../../../domain/services/jwt-token.interface';
import type { IRefreshTokenRepository } from '../../../domain/repositories/i-refresh-token-repository.interface';
import { hashToken } from '../../../domain/services/token-hash.util';

@CommandHandler(LoginCommand)
export class LoginHandler
  implements ICommandHandler<LoginCommand, LoginResponseDto>
{
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(HASH_SERVICE_TOKEN)
    private readonly hashService: IHashService,
    @Inject(AUTH_JWT_SERVICE_TOKEN)
    private readonly jwtTokenService: IJwtTokenService,
    @Inject(AUTH_REFRESH_TOKEN_REPO_TOKEN)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      await this.hashService.compare(command.password, 'dummy');
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác',
        'AUTH_INVALID_CREDENTIALS',
        { suggestion: 'Kiểm tra lại email và mật khẩu' },
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Tài khoản đã bị vô hiệu hóa',
        'AUTH_ACCOUNT_DISABLED',
        { suggestion: 'Liên hệ quản trị viên' },
      );
    }

    const passwordMatch = await this.hashService.compare(
      command.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác',
        'AUTH_INVALID_CREDENTIALS',
        { suggestion: 'Kiểm tra lại email và mật khẩu' },
      );
    }

    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role.value,
    });

    const refreshToken = await this.jwtTokenService.generateRefreshToken();

    await this.refreshTokenRepo.save({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
    });

    return new LoginResponseDto({ accessToken, refreshToken });
  }
}
