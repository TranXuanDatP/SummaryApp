import { CreateCommentHandler } from './create-comment.handler';
import { CreateCommentCommand } from '../create-comment.command';
import { Comment } from '../../../domain/entities';
import { CommentId } from '../../../domain/value-objects';
import { NotFoundException } from 'src/libs/core/common';

describe('CreateCommentHandler', () => {
  let handler: CreateCommentHandler;
  let repository: any;
  let workLogReadDao: any;
  let userReadDao: any;

  const workLogDto = {
    id: 'wl-1',
    projectId: 'p-1',
    employeeId: 'emp-1',
    content: 'Work log',
    isDeleted: false,
  };

  const userDto = {
    id: 'mgr-1',
    fullName: 'Manager One',
  };

  beforeEach(() => {
    repository = { save: jest.fn() };
    workLogReadDao = { findById: jest.fn().mockResolvedValue(workLogDto) };
    userReadDao = { findById: jest.fn().mockResolvedValue(userDto) };

    handler = new CreateCommentHandler(repository, workLogReadDao, userReadDao);
  });

  it('should create a comment and return DTO', async () => {
    const command = new CreateCommentCommand('wl-1', 'Great work!', 'mgr-1');
    const result = await handler.execute(command);

    expect(result.workLogId).toBe('wl-1');
    expect(result.authorId).toBe('mgr-1');
    expect(result.authorName).toBe('Manager One');
    expect(result.content).toBe('Great work!');
    expect(result.isDeleted).toBe(false);
    expect(result.id).toBeDefined();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('should emit CommentCreated event', async () => {
    const command = new CreateCommentCommand('wl-1', 'Nice!', 'mgr-1');
    const result = await handler.execute(command);

    const savedAggregate = repository.save.mock.calls[0][0];
    const events = savedAggregate.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CommentCreated');
  });

  it('should throw NotFoundException when WorkLog not found', async () => {
    workLogReadDao.findById.mockResolvedValue(null);
    const command = new CreateCommentCommand('wl-missing', 'test', 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw on empty content', async () => {
    const command = new CreateCommentCommand('wl-1', '', 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(
      'content is required',
    );
  });

  it('should throw on content exceeding 2000 chars', async () => {
    const command = new CreateCommentCommand('wl-1', 'x'.repeat(2001), 'mgr-1');

    await expect(handler.execute(command)).rejects.toThrow(
      'cannot exceed 2000',
    );
  });
});
