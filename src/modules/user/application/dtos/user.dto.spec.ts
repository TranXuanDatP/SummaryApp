import { UserDto } from './user.dto';

describe('UserDto', () => {
  it('should never contain password field', () => {
    const dto = new UserDto({
      id: 'test-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'employee',
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(dto).not.toHaveProperty('password');
    expect(Object.keys(dto)).not.toContain('password');
  });

  it('should contain all expected fields', () => {
    const now = new Date();
    const dto = new UserDto({
      id: 'test-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'employee',
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.id).toBe('test-id');
    expect(dto.email).toBe('test@example.com');
    expect(dto.fullName).toBe('Test User');
    expect(dto.role).toBe('employee');
    expect(dto.isActive).toBe(true);
    expect(dto.version).toBe(1);
    expect(dto.createdAt).toBe(now);
    expect(dto.updatedAt).toBe(now);
  });
});
