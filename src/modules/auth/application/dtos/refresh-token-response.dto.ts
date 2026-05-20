import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  constructor(params: { accessToken: string; refreshToken: string }) {
    this.accessToken = params.accessToken;
    this.refreshToken = params.refreshToken;
  }
}
