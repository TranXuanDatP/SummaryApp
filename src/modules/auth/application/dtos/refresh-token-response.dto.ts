export class RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;

  constructor(params: { accessToken: string; refreshToken: string }) {
    this.accessToken = params.accessToken;
    this.refreshToken = params.refreshToken;
  }
}
