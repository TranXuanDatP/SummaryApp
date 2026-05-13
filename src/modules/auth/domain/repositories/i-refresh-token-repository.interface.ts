export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface IRefreshTokenRepository {
  save(token: RefreshTokenData): Promise<void>;
  findByTokenHash(hash: string): Promise<RefreshTokenData | null>;
  /**
   * Atomically finds an active (non-revoked) token by hash and revokes it.
   * Returns the token data if found and revoked, null if not found or already revoked.
   * This prevents race conditions on concurrent refresh requests.
   */
  findAndRevokeByTokenHash(hash: string): Promise<RefreshTokenData | null>;
  revokeAllForUser(userId: string): Promise<void>;
  revoke(id: string): Promise<void>;
}
