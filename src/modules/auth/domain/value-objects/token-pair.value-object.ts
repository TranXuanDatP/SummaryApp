export class TokenPair {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}
