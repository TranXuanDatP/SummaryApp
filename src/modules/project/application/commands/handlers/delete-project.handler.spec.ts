import { DeleteProjectHandler } from './delete-project.handler';
import { DeleteProjectCommand } from '../delete-project.command';
import { NotFoundException } from 'src/libs/core/common';
import { Project } from '../../../domain/entities';
import { ProjectId, ProjectStatus } from '../../../domain/value-objects';

function createProject(overrides: { id?: string } = {}): Project {
  return Project.reconstitute(
    overrides.id ?? 'project-1',
    {
      name: 'Test Project',
      description: null,
      status: new ProjectStatus(ProjectStatus.ACTIVE),
    },
    1,
    new Date('2026-01-01'),
    new Date('2026-01-01'),
    null,
  );
}

describe('DeleteProjectHandler', () => {
  let handler: DeleteProjectHandler;
  let mockProjectRepo: any;
  let mockDb: any;

  beforeEach(() => {
    mockProjectRepo = {
      save: jest.fn().mockImplementation((agg: any) => {
        agg.incrementVersion();
        return Promise.resolve(agg);
      }),
      getById: jest.fn(),
    };
    mockDb = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({ rowCount: 0 }),
        }),
      }),
    };
    handler = new DeleteProjectHandler(mockProjectRepo, mockDb);
  });

  it('should soft delete an existing project', async () => {
    const project = createProject();
    mockProjectRepo.getById.mockResolvedValue(project);

    const result = await handler.execute(new DeleteProjectCommand('project-1'));

    expect(result).toEqual({
      deleted: true,
      id: 'project-1',
      workLogsDeleted: 0,
    });
    expect(mockProjectRepo.save).toHaveBeenCalled();
    const savedProject = mockProjectRepo.save.mock.calls[0][0];
    expect(savedProject.isDeleted).toBe(true);
  });

  it('should cascade soft delete work logs belonging to the project', async () => {
    const project = createProject();
    mockProjectRepo.getById.mockResolvedValue(project);
    mockDb.update = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 3 }),
      }),
    });
    handler = new DeleteProjectHandler(mockProjectRepo, mockDb);

    const result = await handler.execute(new DeleteProjectCommand('project-1'));

    expect(result.workLogsDeleted).toBe(3);
  });

  it('should throw NotFoundException when project does not exist', async () => {
    mockProjectRepo.getById.mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteProjectCommand('nonexistent')),
    ).rejects.toThrow(NotFoundException);
  });
});
