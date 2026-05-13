import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
} from 'src/libs/shared';
import type {
  IRefreshTokenRepository,
  RefreshTokenData,
} from '../../../domain/repositories/i-refresh-token-repository.interface';
import { refreshTokensTable } from '../drizzle/schema';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  async save(token: RefreshTokenData): Promise<void> {
    await this.db.insert(refreshTokensTable).values({
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
      createdAt: token.createdAt,
    });
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenData | null> {
    const result = await this.db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.tokenHash, hash))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      userId: result[0].userId,
      tokenHash: result[0].tokenHash,
      expiresAt: result[0].expiresAt,
      isRevoked: result[0].isRevoked,
      createdAt: result[0].createdAt,
    };
  }

  async findAndRevokeByTokenHash(hash: string): Promise<RefreshTokenData | null> {
    const result = await this.db
      .update(refreshTokensTable)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshTokensTable.tokenHash, hash),
          eq(refreshTokensTable.isRevoked, false),
        ),
      )
      .returning();

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      userId: result[0].userId,
      tokenHash: result[0].tokenHash,
      expiresAt: result[0].expiresAt,
      isRevoked: result[0].isRevoked,
      createdAt: result[0].createdAt,
    };
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokensTable)
      .set({ isRevoked: true })
      .where(eq(refreshTokensTable.userId, userId));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(refreshTokensTable)
      .set({ isRevoked: true })
      .where(eq(refreshTokensTable.id, id));
  }
}
