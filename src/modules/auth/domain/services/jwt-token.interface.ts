export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface IJwtTokenService {
  generateAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<string>;

  generateRefreshToken(): Promise<string>;

  verifyAccessToken(token: string): Promise<JwtPayload>;
}
