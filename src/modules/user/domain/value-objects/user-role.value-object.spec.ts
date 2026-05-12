import { UserRole } from './user-role.value-object';
import { DomainException } from 'src/libs/core/domain';

describe('UserRole Value Object', () => {
  describe('constructor', () => {
    it('should create UserRole with employee value', () => {
      const role = new UserRole('employee');

      expect(role.value).toBe('employee');
    });

    it('should create UserRole with manager value', () => {
      const role = new UserRole('manager');

      expect(role.value).toBe('manager');
    });

    it('should throw DomainException for invalid role', () => {
      expect(() => new UserRole('admin')).toThrow(DomainException);
      expect(() => new UserRole('superuser')).toThrow(DomainException);
      expect(() => new UserRole('')).toThrow(DomainException);
    });

    it('should have static constants for valid roles', () => {
      expect(UserRole.EMPLOYEE).toBe('employee');
      expect(UserRole.MANAGER).toBe('manager');
    });
  });

  describe('equals', () => {
    it('should return true for same role', () => {
      const role1 = new UserRole('employee');
      const role2 = new UserRole('employee');

      expect(role1.equals(role2)).toBe(true);
    });

    it('should return false for different roles', () => {
      const role1 = new UserRole('employee');
      const role2 = new UserRole('manager');

      expect(role1.equals(role2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value', () => {
      const role = new UserRole('manager');

      expect(role.toString()).toBe('manager');
    });
  });
});
