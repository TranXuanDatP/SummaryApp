import { WorkLogId } from './work-log-id.value-object';
import { DomainException } from 'src/libs/core/domain';

describe('WorkLogId', () => {
  it('should create with valid value', () => {
    const id = new WorkLogId('test-id-123');
    expect(id.value).toBe('test-id-123');
  });

  it('should throw on empty value', () => {
    expect(() => new WorkLogId('')).toThrow(DomainException);
    expect(() => new WorkLogId('')).toThrow('cannot be empty');
  });

  it('should throw on whitespace-only value', () => {
    expect(() => new WorkLogId('   ')).toThrow(DomainException);
  });

  it('should throw on value exceeding 50 characters', () => {
    expect(() => new WorkLogId('a'.repeat(51))).toThrow(DomainException);
    expect(() => new WorkLogId('a'.repeat(51))).toThrow('cannot exceed 50');
  });

  it('should accept value at exactly 50 characters', () => {
    const id = new WorkLogId('a'.repeat(50));
    expect(id.value).toHaveLength(50);
  });

  it('should compare by value', () => {
    const a = new WorkLogId('same');
    const b = new WorkLogId('same');
    const c = new WorkLogId('different');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('should return value as string', () => {
    const id = new WorkLogId('abc');
    expect(id.toString()).toBe('abc');
  });
});
