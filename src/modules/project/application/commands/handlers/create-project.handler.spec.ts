import { randomUUID } from 'crypto';
import { CreateProjectHandler } from './create-project.handler';
import { CreateProjectCommand } from '../create-project.command';
import { IProjectRepository } from '../../../domain/repositories';
import { Project } from '../../../domain/entities';
import { ProjectId, ProjectStatus } from '../../../domain/value-objects';
import { ConflictException } from 'src/libs/core/common';

describe('CreateProjectHandler', () => {
  let handler: CreateProjectHandler;
  let mockRepository: {
    findByName: jest.Mock;
    save: jest.Mock;
    getById: jest.Mock;
  };

  beforeEach(() => {
    mockRepository = {
      findByName: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((agg: any) => { agg.incrementVersion(); return Promise.resolve(agg); }),
      getById: jest.fn(),
    };
    handler = new CreateProjectHandler(
      mockRepository as unknown as IProjectRepository,
    );
  });

  it('should create a project and return DTO', async () => {
    const command = new CreateProjectCommand('Dự án Alpha', 'Mô tả');
    const result = await handler.execute(command);

    expect(result.name).toBe('Dự án Alpha');
    expect(result.description).toBe('Mô tả');
    expect(result.status).toBe('active');
    expect(result.version).toBe(1);
    expect(result.id).toBeDefined();
    expect(mockRepository.findByName).toHaveBeenCalledWith('Dự án Alpha');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should create project with null description', async () => {
    const command = new CreateProjectCommand('Dự án Beta', null);
    const result = await handler.execute(command);

    expect(result.name).toBe('Dự án Beta');
    expect(result.description).toBeNull();
  });

  it('should throw ConflictException if name already exists', async () => {
    const existingProject = Project.reconstitute(
      'existing-id',
      { name: 'Trùng tên', description: null, status: new ProjectStatus('active') },
      1,
      new Date(),
      new Date(),
    );
    mockRepository.findByName.mockResolvedValue(existingProject);

    const command = new CreateProjectCommand('Trùng tên', null);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException on DB unique constraint violation', async () => {
    const dbError: any = new Error('unique violation');
    dbError.code = '23505';
    mockRepository.save.mockRejectedValue(dbError);

    const command = new CreateProjectCommand('Dự án', null);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should re-throw non-unique-constraint errors', async () => {
    const otherError = new Error('connection lost');
    mockRepository.save.mockRejectedValue(otherError);

    const command = new CreateProjectCommand('Dự án', null);

    await expect(handler.execute(command)).rejects.toThrow('connection lost');
  });
});
