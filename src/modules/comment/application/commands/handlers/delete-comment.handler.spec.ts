import { DeleteCommentHandler } from './delete-comment.handler';
import { DeleteCommentCommand } from '../delete-comment.command';
import { Comment } from '../../../domain/entities';
import { CommentId } from '../../../domain/value-objects';
import { NotFoundException, ForbiddenException } from 'src/libs/core/common';

describe('DeleteCommentHandler', () => {
  let handler: DeleteCommentHandler;
  let repository: any;

  const createComment = () => {
    return Comment.create(new CommentId('c-1'), {
      workLogId: 'wl-1',
      authorId: 'mgr-1',
      content: 'Test comment',
    });
  };

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      getById: jest.fn().mockImplementation(async () => {
        const comment = createComment();
        comment.clearDomainEvents();
        return comment;
      }),
    };

    handler = new DeleteCommentHandler(repository);
  });

  it('should soft-delete and return { deleted: true, id }', async () => {
    const command = new DeleteCommentCommand('c-1', 'mgr-1');
    const result = await handler.execute(command);

    expect(result).toEqual({ deleted: true, id: 'c-1' });
    expect(repository.save).toHaveBeenCalledTimes(1);

    const savedAggregate = repository.save.mock.calls[0][0];
    expect(savedAggregate.isDeleted).toBe(true);
  });

  it('should emit CommentDeleted event', async () => {
    const command = new DeleteCommentCommand('c-1', 'mgr-1');
    await handler.execute(command);

    const savedAggregate = repository.save.mock.calls[0][0];
    const events = savedAggregate.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CommentDeleted');
  });

  it('should throw NotFoundException when comment not found', async () => {
    repository.getById.mockResolvedValue(null);
    const command = new DeleteCommentCommand('c-missing', 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when not the author', async () => {
    const command = new DeleteCommentCommand('c-1', 'mgr-2');

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
  });

  it('should throw when deleting already-deleted comment', async () => {
    repository.getById.mockImplementation(async () => {
      const comment = createComment();
      comment.delete();
      comment.clearDomainEvents();
      return comment;
    });

    const command = new DeleteCommentCommand('c-1', 'mgr-1');
    await expect(handler.execute(command)).rejects.toThrow('already deleted');
  });
});
