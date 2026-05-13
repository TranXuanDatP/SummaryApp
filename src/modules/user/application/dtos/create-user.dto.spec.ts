import { CreateUserDto } from './create-user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('CreateUserDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'employee',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid email', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'not-an-email',
      password: 'password123',
      fullName: 'Test',
      role: 'employee',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should reject short password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      password: 'short',
      fullName: 'Test',
      role: 'employee',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('should reject empty fullName', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      password: 'password123',
      fullName: '',
      role: 'employee',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('fullName');
  });

  it('should reject invalid role', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test',
      role: 'admin',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('role');
  });
});
