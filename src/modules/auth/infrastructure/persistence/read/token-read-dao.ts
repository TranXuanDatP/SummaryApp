import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
import { DATABASE_READ_TOKEN, type DrizzleDB } from 'src/libs/shared';
import { refreshTokensTable } from '../drizzle/schema';

@Injectable()
export class TokenReadDao {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  async findActiveByUserId(userId: string) {
    return this.db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          eq(refreshTokensTable.isRevoked, false),
        ),
      );
  }

  async findExpiredTokens() {
    return this.db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.isRevoked, false),
          lt(refreshTokensTable.expiresAt, new Date()),
        ),
      );
  }
}
