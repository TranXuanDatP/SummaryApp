export interface IHashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}

export const HASH_SERVICE_TOKEN = Symbol('IHashService');
