import { DomainException } from 'src/libs/core/domain';
import { ProjectId } from './project-id.value-object';

describe('ProjectId', () => {
  it('should create with valid value', () => {
    const id = new ProjectId('proj-123');
    expect(id.value).toBe('proj-123');
  });

  it('should throw on empty value', () => {
    expect(() => new ProjectId('')).toThrow(DomainException);
    expect(() => new ProjectId('')).toThrow('Project ID cannot be empty');
  });

  it('should throw on whitespace-only value', () => {
    expect(() => new ProjectId('   ')).toThrow(DomainException);
  });

  it('should throw when exceeding 50 characters', () => {
    const longId = 'a'.repeat(51);
    expect(() => new ProjectId(longId)).toThrow(DomainException);
    expect(() => new ProjectId(longId)).toThrow(
      'Project ID cannot exceed 50 characters',
    );
  });

  it('should accept exactly 50 characters', () => {
    const id = new ProjectId('a'.repeat(50));
    expect(id.value).toHaveLength(50);
  });

  it('should compare equal ProjectIds', () => {
    const a = new ProjectId('proj-1');
    const b = new ProjectId('proj-1');
    expect(a.equals(b)).toBe(true);
  });

  it('should compare different ProjectIds as not equal', () => {
    const a = new ProjectId('proj-1');
    const b = new ProjectId('proj-2');
    expect(a.equals(b)).toBe(false);
  });

  it('should return value via toString', () => {
    const id = new ProjectId('proj-123');
    expect(id.toString()).toBe('proj-123');
  });
});
