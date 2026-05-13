import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type {
  IJwtTokenService,
  JwtPayload,
} from '../../domain/services/jwt-token.interface';

@Injectable()
export class JwtTokenService implements IJwtTokenService {
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET')!;
    if (!this.jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is required but not set',
      );
    }
  }

  async generateAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(): Promise<string> {
    return randomBytes(64).toString('hex');
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.jwtSecret,
    });
  }
}
