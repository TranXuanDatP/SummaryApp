import { UpdateCommentHandler } from './update-comment.handler';
import { UpdateCommentCommand } from '../update-comment.command';
import { Comment } from '../../../domain/entities';
import { CommentId } from '../../../domain/value-objects';
import { NotFoundException, ForbiddenException } from 'src/libs/core/common';

describe('UpdateCommentHandler', () => {
  let handler: UpdateCommentHandler;
  let repository: any;
  let userReadDao: any;

  const createComment = () => {
    return Comment.create(new CommentId('c-1'), {
      workLogId: 'wl-1',
      authorId: 'mgr-1',
      content: 'Original',
    });
  };

  const userDto = { id: 'mgr-1', fullName: 'Manager One' };

  beforeEach(() => {
    userReadDao = { findById: jest.fn().mockResolvedValue(userDto) };
    repository = {
      save: jest.fn(),
      getById: jest.fn().mockImplementation(async () => {
        const comment = createComment();
        comment.clearDomainEvents();
        return comment;
      }),
    };

    handler = new UpdateCommentHandler(repository, userReadDao);
  });

  it('should update content and return DTO', async () => {
    const command = new UpdateCommentCommand('c-1', 'Updated content', 'mgr-1');
    const result = await handler.execute(command);

    expect(result.content).toBe('Updated content');
    expect(result.authorName).toBe('Manager One');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should emit CommentUpdated event', async () => {
    const command = new UpdateCommentCommand('c-1', 'New content', 'mgr-1');
    await handler.execute(command);

    const savedAggregate = repository.save.mock.calls[0][0];
    const events = savedAggregate.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CommentUpdated');
  });

  it('should throw NotFoundException when comment not found', async () => {
    repository.getById.mockResolvedValue(null);
    const command = new UpdateCommentCommand('c-missing', 'test', 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when not the author', async () => {
    const command = new UpdateCommentCommand('c-1', 'test', 'mgr-2');

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
  });

  it('should throw on empty content', async () => {
    const command = new UpdateCommentCommand('c-1', '', 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(
      'content is required',
    );
  });
});
