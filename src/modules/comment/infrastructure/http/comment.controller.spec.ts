import { WorkLogCommentController, CommentController } from './comment.controller';
import { CreateCommentCommand, UpdateCommentCommand, DeleteCommentCommand } from '../../application/commands';

describe('Comment Controllers', () => {
  let workLogCommentController: WorkLogCommentController;
  let commentController: CommentController;
  let commandBus: any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    workLogCommentController = new WorkLogCommentController(commandBus);
    commentController = new CommentController(commandBus);
  });

  describe('WorkLogCommentController', () => {
    it('should dispatch CreateCommentCommand on POST', async () => {
      const dto = { content: 'Nice work!' };
      const user = { userId: 'mgr-1', role: 'manager' };
      const res = { header: jest.fn() } as any;
      const commentDto = { id: 'c-1', workLogId: 'wl-1', content: 'Nice work!' };
      commandBus.execute.mockResolvedValue(commentDto);

      const result = await workLogCommentController.create('wl-1', dto, user, res);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(CreateCommentCommand);
      expect(command.workLogId).toBe('wl-1');
      expect(command.content).toBe('Nice work!');
      expect(command.authorId).toBe('mgr-1');
      expect(res.header).toHaveBeenCalledWith('Location', '/comments/c-1');
      expect(result).toEqual(commentDto);
    });
  });

  describe('CommentController', () => {
    it('should dispatch UpdateCommentCommand on PUT', async () => {
      const dto = { content: 'Updated!' };
      const user = { userId: 'mgr-1', role: 'manager' };
      const commentDto = { id: 'c-1', content: 'Updated!' };
      commandBus.execute.mockResolvedValue(commentDto);

      const result = await commentController.update('c-1', dto, user);

      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(UpdateCommentCommand);
      expect(command.id).toBe('c-1');
      expect(command.content).toBe('Updated!');
      expect(command.authorId).toBe('mgr-1');
      expect(result).toEqual(commentDto);
    });

    it('should dispatch DeleteCommentCommand on DELETE', async () => {
      const user = { userId: 'mgr-1', role: 'manager' };
      commandBus.execute.mockResolvedValue({ deleted: true, id: 'c-1' });

      const result = await commentController.delete('c-1', user);

      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteCommentCommand);
      expect(command.id).toBe('c-1');
      expect(command.authorId).toBe('mgr-1');
      expect(result).toEqual({ deleted: true, id: 'c-1' });
    });
  });
});
