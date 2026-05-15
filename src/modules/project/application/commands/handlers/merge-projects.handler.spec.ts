import { MergeProjectsHandler } from './merge-projects.handler';
import { MergeProjectsCommand } from '../merge-projects.command';
import { IProjectRepository } from '../../../domain/repositories';
import { Project } from '../../../domain/entities';
import { ProjectStatus } from '../../../domain/value-objects';
import { NotFoundException } from 'src/libs/core/common';

describe('MergeProjectsHandler', () => {
  let handler: MergeProjectsHandler;
  let mockRepository: {
    getById: jest.Mock;
    save: jest.Mock;
    findByName: jest.Mock;
  };

  const createProject = (id: string, name: string, status: string) =>
    Project.reconstitute(
      id,
      { name, description: null, status: new ProjectStatus(status) },
      1,
      new Date(),
      new Date(),
    );

  beforeEach(() => {
    mockRepository = {
      getById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findByName: jest.fn(),
    };
    handler = new MergeProjectsHandler(
      mockRepository as unknown as IProjectRepository,
    );
  });

  it('should merge source projects into target', async () => {
    mockRepository.getById
      .mockResolvedValueOnce(createProject('target-1', 'Target', 'active'))
      .mockResolvedValueOnce(createProject('source-1', 'Source', 'active'));

    const command = new MergeProjectsCommand('target-1', ['source-1'], 'manager-1');
    const result = await handler.execute(command);

    expect(result.id).toBe('target-1');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should merge multiple source projects', async () => {
    mockRepository.getById
      .mockResolvedValueOnce(createProject('target-1', 'Target', 'active'))
      .mockResolvedValueOnce(createProject('source-1', 'Source 1', 'active'))
      .mockResolvedValueOnce(createProject('source-2', 'Source 2', 'active'));

    const command = new MergeProjectsCommand('target-1', ['source-1', 'source-2'], 'manager-1');
    const result = await handler.execute(command);

    expect(result.id).toBe('target-1');
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });

  it('should throw NotFoundException when target not found', async () => {
    mockRepository.getById.mockResolvedValueOnce(null);

    const command = new MergeProjectsCommand('nonexistent', ['source-1'], 'manager-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when source not found', async () => {
    mockRepository.getById
      .mockResolvedValueOnce(createProject('target-1', 'Target', 'active'))
      .mockResolvedValueOnce(null);

    const command = new MergeProjectsCommand('target-1', ['nonexistent'], 'manager-1');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw when sourceId equals targetId', async () => {
    mockRepository.getById
      .mockResolvedValueOnce(createProject('target-1', 'Target', 'active'));

    const command = new MergeProjectsCommand('target-1', ['target-1'], 'manager-1');

    await expect(handler.execute(command)).rejects.toThrow('Cannot merge a project into itself');
  });

  it('should throw when source is already archived', async () => {
    mockRepository.getById
      .mockResolvedValueOnce(createProject('target-1', 'Target', 'active'))
      .mockResolvedValueOnce(createProject('archived-1', 'Archived', 'archived'));

    const command = new MergeProjectsCommand('target-1', ['archived-1'], 'manager-1');

    await expect(handler.execute(command)).rejects.toThrow('already archived');
  });
});
