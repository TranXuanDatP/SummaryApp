import { SearchProjectsHandler } from './search-projects.handler';
import { SearchProjectsQuery } from '../search-projects.query';
import { IProjectReadDao } from '../ports';
import { ProjectDto } from '../../dtos';

describe('SearchProjectsHandler', () => {
  let handler: SearchProjectsHandler;
  let mockReadDao: {
    search: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    findByName: jest.Mock;
  };

  const sampleDto = new ProjectDto({
    id: 'proj-1',
    name: 'Dự án Alpha',
    description: null,
    status: 'active',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockReadDao = {
      search: jest.fn().mockResolvedValue({ data: [sampleDto], total: 1 }),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByName: jest.fn(),
    };
    handler = new SearchProjectsHandler(
      mockReadDao as unknown as IProjectReadDao,
    );
  });

  it('should return search results with pagination', async () => {
    const query = new SearchProjectsQuery('dự án', 1, 20);
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(mockReadDao.search).toHaveBeenCalledWith({
      query: 'dự án',
      page: 1,
      limit: 20,
    });
  });

  it('should return empty when no results', async () => {
    mockReadDao.search.mockResolvedValue({ data: [], total: 0 });
    const query = new SearchProjectsQuery('xyz', 1, 20);
    const result = await handler.execute(query);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should compute totalPages correctly', async () => {
    mockReadDao.search.mockResolvedValue({ data: [sampleDto], total: 25 });
    const query = new SearchProjectsQuery('test', 1, 20);
    const result = await handler.execute(query);

    expect(result.totalPages).toBe(2);
  });
});
