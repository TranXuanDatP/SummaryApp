export interface ITokenReadDao {
  findActiveByUserId(userId: string): Promise<any[]>;
  findExpiredTokens(): Promise<any[]>;
}
