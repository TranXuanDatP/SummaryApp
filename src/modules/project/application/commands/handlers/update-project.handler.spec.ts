import { UpdateProjectHandler } from './update-project.handler';
import { UpdateProjectCommand } from '../update-project.command';
import { IProjectRepository } from '../../../domain/repositories';
import { Project } from '../../../domain/entities';
import { ProjectId, ProjectStatus } from '../../../domain/value-objects';
import { NotFoundException } from 'src/libs/core/common';

describe('UpdateProjectHandler', () => {
  let handler: UpdateProjectHandler;
  let mockRepository: {
    getById: jest.Mock;
    save: jest.Mock;
    findByName: jest.Mock;
  };

  beforeEach(() => {
    const project = Project.reconstitute(
      'project-1',
      {
        name: 'Old Name',
        description: 'Old desc',
        status: new ProjectStatus('active'),
      },
      1,
      new Date(),
      new Date(),
    );
    mockRepository = {
      getById: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockResolvedValue(undefined),
      findByName: jest.fn(),
    };
    handler = new UpdateProjectHandler(
      mockRepository as unknown as IProjectRepository,
    );
  });

  it('should update project name and return DTO', async () => {
    const command = new UpdateProjectCommand(
      'project-1',
      'New Name',
      undefined,
    );
    const result = await handler.execute(command);

    expect(result.name).toBe('New Name');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should update project description and return DTO', async () => {
    const command = new UpdateProjectCommand(
      'project-1',
      undefined,
      'New desc',
    );
    const result = await handler.execute(command);

    expect(result.description).toBe('New desc');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should update both name and description', async () => {
    const command = new UpdateProjectCommand(
      'project-1',
      'New Name',
      'New desc',
    );
    const result = await handler.execute(command);

    expect(result.name).toBe('New Name');
    expect(result.description).toBe('New desc');
  });

  it('should set description to null', async () => {
    const command = new UpdateProjectCommand('project-1', undefined, null);
    const result = await handler.execute(command);

    expect(result.description).toBeNull();
  });

  it('should throw NotFoundException when project not found', async () => {
    mockRepository.getById.mockResolvedValue(null);

    const command = new UpdateProjectCommand('nonexistent', 'Name');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
