import { UserId } from './user-id.value-object';
import { DomainException } from 'src/libs/core/domain';

describe('UserId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid UserId', () => {
      const id = new UserId('user-123');

      expect(id.value).toBe('user-123');
    });

    it('should throw DomainException for empty value', () => {
      expect(() => new UserId('')).toThrow(DomainException);
      expect(() => new UserId('')).toThrow('User ID cannot be empty');
    });

    it('should throw DomainException for whitespace-only value', () => {
      expect(() => new UserId('   ')).toThrow(DomainException);
    });

    it('should throw DomainException for value exceeding 50 characters', () => {
      const longId = 'a'.repeat(51);

      expect(() => new UserId(longId)).toThrow(DomainException);
      expect(() => new UserId(longId)).toThrow(
        'User ID cannot exceed 50 characters',
      );
    });

    it('should accept value with exactly 50 characters', () => {
      const exactId = 'a'.repeat(50);
      const id = new UserId(exactId);

      expect(id.value).toBe(exactId);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const id1 = new UserId('user-123');
      const id2 = new UserId('user-123');

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = new UserId('user-123');
      const id2 = new UserId('user-456');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false for null', () => {
      const id = new UserId('user-123');

      expect(id.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as string', () => {
      const id = new UserId('user-123');

      expect(id.toString()).toBe('user-123');
    });
  });
});
