import { Comment } from './comment.entity';
import { CommentId } from '../value-objects';

describe('Comment', () => {
  const validId = new CommentId('comment-1');
  const validProps = {
    workLogId: 'wl-1',
    authorId: 'mgr-1',
    content: 'Good work this week!',
  };

  describe('create', () => {
    it('should create a valid comment', () => {
      const comment = Comment.create(validId, validProps);

      expect(comment.id).toBe('comment-1');
      expect(comment.workLogId).toBe('wl-1');
      expect(comment.authorId).toBe('mgr-1');
      expect(comment.content).toBe('Good work this week!');
      expect(comment.isDeleted).toBe(false);
      expect(comment.deletedAt).toBeNull();
    });

    it('should trim content on create', () => {
      const comment = Comment.create(validId, {
        ...validProps,
        content: '  Hello  ',
      });
      expect(comment.content).toBe('Hello');
    });

    it('should emit CommentCreated event', () => {
      const comment = Comment.create(validId, validProps);
      const events = comment.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CommentCreated');
      expect(events[0].data).toEqual({
        workLogId: 'wl-1',
        authorId: 'mgr-1',
        content: 'Good work this week!',
      });
    });

    it('should throw on empty content', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, content: '' }),
      ).toThrow('content is required');
    });

    it('should throw on whitespace-only content', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, content: '   ' }),
      ).toThrow('content is required');
    });

    it('should throw on trimmed content exceeding 2000 characters', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, content: 'x'.repeat(2001) }),
      ).toThrow('cannot exceed 2000');
    });

    it('should accept content at max length (2000)', () => {
      const comment = Comment.create(validId, {
        ...validProps,
        content: 'x'.repeat(2000),
      });
      expect(comment.content).toHaveLength(2000);
    });

    it('should throw on empty workLogId', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, workLogId: '' }),
      ).toThrow('WorkLog ID is required');
    });

    it('should throw on whitespace-only workLogId', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, workLogId: '   ' }),
      ).toThrow('WorkLog ID is required');
    });

    it('should trim workLogId on create', () => {
      const comment = Comment.create(validId, {
        ...validProps,
        workLogId: '  wl-1  ',
      });
      expect(comment.workLogId).toBe('wl-1');
    });

    it('should throw on workLogId exceeding 50 characters', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, workLogId: 'w'.repeat(51) }),
      ).toThrow('cannot exceed 50');
    });

    it('should throw on empty authorId', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, authorId: '' }),
      ).toThrow('Author ID is required');
    });

    it('should throw on whitespace-only authorId', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, authorId: '   ' }),
      ).toThrow('Author ID is required');
    });

    it('should trim authorId on create', () => {
      const comment = Comment.create(validId, {
        ...validProps,
        authorId: '  mgr-1  ',
      });
      expect(comment.authorId).toBe('mgr-1');
    });

    it('should throw on authorId exceeding 50 characters', () => {
      expect(() =>
        Comment.create(validId, { ...validProps, authorId: 'a'.repeat(51) }),
      ).toThrow('cannot exceed 50');
    });
  });

  describe('reconstitute', () => {
    it('should restore all fields', () => {
      const createdAt = new Date('2026-05-01');
      const updatedAt = new Date('2026-05-02');

      const comment = Comment.reconstitute(
        'comment-1',
        validProps,
        3,
        createdAt,
        updatedAt,
        null,
      );

      expect(comment.id).toBe('comment-1');
      expect(comment.workLogId).toBe('wl-1');
      expect(comment.authorId).toBe('mgr-1');
      expect(comment.content).toBe('Good work this week!');
      expect(comment.version).toBe(3);
      expect(comment.isDeleted).toBe(false);
    });

    it('should restore deleted state', () => {
      const deletedAt = new Date('2026-05-03');

      const comment = Comment.reconstitute(
        'comment-1',
        validProps,
        1,
        new Date(),
        new Date(),
        deletedAt,
      );

      expect(comment.isDeleted).toBe(true);
      expect(comment.deletedAt).toEqual(deletedAt);
    });

    it('should NOT emit events on reconstitute', () => {
      const comment = Comment.reconstitute(
        'comment-1',
        validProps,
        0,
        new Date(),
        new Date(),
      );

      expect(comment.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('updateContent', () => {
    it('should update content and emit event', () => {
      const comment = Comment.create(validId, validProps);
      comment.clearDomainEvents();

      comment.updateContent('Updated feedback');

      expect(comment.content).toBe('Updated feedback');
      const events = comment.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CommentUpdated');
      expect((events[0] as any).data.content).toBe('Updated feedback');
    });

    it('should trim content on update', () => {
      const comment = Comment.create(validId, validProps);
      comment.updateContent('  Trim me  ');
      expect(comment.content).toBe('Trim me');
    });

    it('should throw on empty content', () => {
      const comment = Comment.create(validId, validProps);
      expect(() => comment.updateContent('')).toThrow('content is required');
    });

    it('should throw on trimmed content exceeding 2000 characters', () => {
      const comment = Comment.create(validId, validProps);
      expect(() => comment.updateContent('x'.repeat(2001))).toThrow(
        'cannot exceed 2000',
      );
    });

    it('should throw when updating deleted comment', () => {
      const comment = Comment.create(validId, validProps);
      comment.delete();
      comment.clearDomainEvents();

      expect(() => comment.updateContent('New content')).toThrow(
        'already deleted',
      );
    });
  });

  describe('delete', () => {
    it('should mark as deleted and emit event with deletedAt', () => {
      const comment = Comment.create(validId, validProps);
      comment.clearDomainEvents();

      comment.delete();

      expect(comment.isDeleted).toBe(true);
      expect(comment.deletedAt).toBeInstanceOf(Date);
      const events = comment.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CommentDeleted');
      expect((events[0] as any).data.deletedAt).toBeDefined();
    });

    it('should throw when deleting already deleted comment', () => {
      const comment = Comment.create(validId, validProps);
      comment.delete();

      expect(() => comment.delete()).toThrow('already deleted');
    });
  });
});
