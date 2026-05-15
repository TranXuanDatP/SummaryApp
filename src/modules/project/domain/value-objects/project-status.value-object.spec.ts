import { DomainException } from 'src/libs/core/domain';
import { ProjectStatus } from './project-status.value-object';

describe('ProjectStatus', () => {
  describe('valid values', () => {
    it('should create with active status', () => {
      const status = new ProjectStatus(ProjectStatus.ACTIVE);
      expect(status.value).toBe('active');
    });

    it('should create with completed status', () => {
      const status = new ProjectStatus(ProjectStatus.COMPLETED);
      expect(status.value).toBe('completed');
    });

    it('should create with archived status', () => {
      const status = new ProjectStatus(ProjectStatus.ARCHIVED);
      expect(status.value).toBe('archived');
    });
  });

  describe('invalid values', () => {
    it('should throw on invalid status', () => {
      expect(() => new ProjectStatus('unknown')).toThrow(DomainException);
      expect(() => new ProjectStatus('unknown')).toThrow(
        'Invalid project status',
      );
    });

    it('should throw on empty string', () => {
      expect(() => new ProjectStatus('')).toThrow(DomainException);
    });
  });

  describe('equality', () => {
    it('should consider same statuses equal', () => {
      const a = new ProjectStatus(ProjectStatus.ACTIVE);
      const b = new ProjectStatus(ProjectStatus.ACTIVE);
      expect(a.equals(b)).toBe(true);
    });

    it('should consider different statuses not equal', () => {
      const a = new ProjectStatus(ProjectStatus.ACTIVE);
      const b = new ProjectStatus(ProjectStatus.COMPLETED);
      expect(a.equals(b)).toBe(false);
    });
  });

  it('should return value via toString', () => {
    expect(new ProjectStatus(ProjectStatus.ACTIVE).toString()).toBe('active');
  });

  it('should expose static constants', () => {
    expect(ProjectStatus.ACTIVE).toBe('active');
    expect(ProjectStatus.COMPLETED).toBe('completed');
    expect(ProjectStatus.ARCHIVED).toBe('archived');
  });
});
