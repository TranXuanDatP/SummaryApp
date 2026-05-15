import { ProjectController } from './project.controller';
import { ProjectDto } from '../../application/dtos';
import { CreateProjectCommand, UpdateProjectCommand, MergeProjectsCommand } from '../../application/commands';
import { GetProjectQuery, GetProjectListQuery, SearchProjectsQuery } from '../../application/queries';

describe('ProjectController', () => {
  let controller: ProjectController;
  let mockCommandBus: { execute: jest.Mock };
  let mockQueryBus: { execute: jest.Mock };

  const sampleDto = new ProjectDto({
    id: 'proj-1',
    name: 'Dự án Test',
    description: 'Mô tả',
    status: 'active',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockCommandBus = { execute: jest.fn() };
    mockQueryBus = { execute: jest.fn() };
    controller = new ProjectController(
      mockCommandBus as any,
      mockQueryBus as any,
    );
  });

  describe('create', () => {
    it('should create project and set Location header', async () => {
      mockCommandBus.execute.mockResolvedValue(sampleDto);
      const mockRes = { header: jest.fn() } as any;

      const dto = { name: 'Dự án Test', description: 'Mô tả' } as any;
      const result = await controller.create(dto, mockRes);

      expect(result).toBe(sampleDto);
      expect(mockRes.header).toHaveBeenCalledWith('Location', '/projects/proj-1');
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('getList', () => {
    it('should return paginated list with default pagination', async () => {
      const listResult = { data: [sampleDto], total: 1, page: 1, totalPages: 1 };
      mockQueryBus.execute.mockResolvedValue(listResult);

      const result = await controller.getList();

      expect(result).toEqual(listResult);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should parse pagination params', async () => {
      const listResult = { data: [], total: 0, page: 2, totalPages: 0 };
      mockQueryBus.execute.mockResolvedValue(listResult);

      const result = await controller.getList('2', '10');

      expect(result.page).toBe(2);
    });
  });

  describe('getById', () => {
    it('should return project by ID', async () => {
      mockQueryBus.execute.mockResolvedValue(sampleDto);

      const result = await controller.getById('proj-1');

      expect(result).toBe(sampleDto);
    });
  });

  describe('update', () => {
    it('should update project and return DTO', async () => {
      const updatedDto = new ProjectDto({
        ...sampleDto,
        name: 'Updated Name',
        version: 2,
      });
      mockCommandBus.execute.mockResolvedValue(updatedDto);

      const dto = { name: 'Updated Name' } as any;
      const result = await controller.update('proj-1', dto);

      expect(result.name).toBe('Updated Name');
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      const searchResult = { data: [sampleDto], total: 1, page: 1, totalPages: 1 };
      mockQueryBus.execute.mockResolvedValue(searchResult);

      const result = await controller.search('Dự án');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should return empty results for empty query', async () => {
      const result = await controller.search('');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await controller.search('   ');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should return empty results when query is undefined', async () => {
      const result = await controller.search(undefined);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    it('should merge projects and return target DTO', async () => {
      const targetDto = new ProjectDto({
        id: 'target-1',
        name: 'Target',
        description: null,
        status: 'active',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCommandBus.execute.mockResolvedValue(targetDto);

      const dto = { sourceIds: ['source-1', 'source-2'] };
      const user = { id: 'manager-1' };
      const result = await controller.merge('target-1', dto as any, user);

      expect(result).toBe(targetDto);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new MergeProjectsCommand('target-1', ['source-1', 'source-2'], 'manager-1'),
      );
    });
  });
});
