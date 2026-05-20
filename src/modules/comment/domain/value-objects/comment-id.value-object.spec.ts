import { CommentId } from './comment-id.value-object';
import { DomainException } from 'src/libs/core/domain';

describe('CommentId', () => {
  it('should create with valid value', () => {
    const id = new CommentId('comment-123');
    expect(id.value).toBe('comment-123');
  });

  it('should throw on empty value', () => {
    expect(() => new CommentId('')).toThrow(DomainException);
    expect(() => new CommentId('')).toThrow('cannot be empty');
  });

  it('should throw on whitespace-only value', () => {
    expect(() => new CommentId('   ')).toThrow(DomainException);
  });

  it('should throw on value exceeding 50 characters', () => {
    expect(() => new CommentId('a'.repeat(51))).toThrow(DomainException);
    expect(() => new CommentId('a'.repeat(51))).toThrow('cannot exceed 50');
  });

  it('should accept value at max length (50)', () => {
    const id = new CommentId('a'.repeat(50));
    expect(id.value).toHaveLength(50);
  });

  it('should be equal to another CommentId with same value', () => {
    const a = new CommentId('abc');
    const b = new CommentId('abc');
    expect(a.equals(b)).toBe(true);
  });

  it('should not be equal to another CommentId with different value', () => {
    const a = new CommentId('abc');
    const b = new CommentId('xyz');
    expect(a.equals(b)).toBe(false);
  });

  it('should trim whitespace from value', () => {
    const id = new CommentId('  abc  ');
    expect(id.value).toBe('abc');
  });

  it('should return value on toString', () => {
    expect(new CommentId('c-1').toString()).toBe('c-1');
  });
});
