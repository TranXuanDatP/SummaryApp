import { UserEmail } from './user-email.value-object';
import { DomainException } from 'src/libs/core/domain';

describe('UserEmail Value Object', () => {
  describe('constructor', () => {
    it('should create a valid UserEmail', () => {
      const email = new UserEmail('user@example.com');

      expect(email.value).toBe('user@example.com');
    });

    it('should throw DomainException for empty value', () => {
      expect(() => new UserEmail('')).toThrow(DomainException);
      expect(() => new UserEmail('')).toThrow('Email người dùng không được để trống');
    });

    it('should throw DomainException for invalid email format', () => {
      const invalidEmails = [
        'plainaddress',
        '@missinglocal.com',
        'missing@domain',
        'missing@.com',
        'spaces in@email.com',
        'missingat.com',
      ];

      invalidEmails.forEach((invalid) => {
        expect(() => new UserEmail(invalid)).toThrow(DomainException);
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@sub.domain.com',
      ];

      validEmails.forEach((valid) => {
        expect(() => new UserEmail(valid)).not.toThrow();
      });
    });
  });

  describe('equals', () => {
    it('should return true for same email', () => {
      const email1 = new UserEmail('user@example.com');
      const email2 = new UserEmail('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = new UserEmail('user1@example.com');
      const email2 = new UserEmail('user2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });
  });
});
