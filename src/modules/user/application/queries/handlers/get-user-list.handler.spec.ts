import { GetUserListHandler } from './get-user-list.handler';
import { GetUserListQuery } from '../get-user-list.query';
import { UserDto } from '../../dtos';

describe('GetUserListHandler', () => {
  let handler: GetUserListHandler;
  let mockUserReadDao: any;

  beforeEach(() => {
    mockUserReadDao = {
      findAll: jest.fn(),
    };
    handler = new GetUserListHandler(mockUserReadDao);
  });

  it('should return paginated result', async () => {
    const users = [
      new UserDto({
        id: 'id-1',
        email: 'user1@example.com',
        fullName: 'User 1',
        role: 'employee',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    mockUserReadDao.findAll.mockResolvedValue({ data: users, total: 1 });

    const result = await handler.execute(new GetUserListQuery(1, 20));

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect((result.data[0] as any).password).toBeUndefined();
  });

  it('should return empty list with correct pagination', async () => {
    mockUserReadDao.findAll.mockResolvedValue({ data: [], total: 0 });

    const result = await handler.execute(new GetUserListQuery(1, 20));

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly', async () => {
    mockUserReadDao.findAll.mockResolvedValue({ data: [], total: 45 });

    const result = await handler.execute(new GetUserListQuery(1, 20));

    expect(result.totalPages).toBe(3);
  });
});
