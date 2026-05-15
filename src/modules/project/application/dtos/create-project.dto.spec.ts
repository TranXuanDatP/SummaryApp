import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  it('should pass with valid name only', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'Dự án Alpha';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid name and description', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'Dự án Alpha';
    dto.description = 'Mô tả dự án';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty', async () => {
    const dto = new CreateProjectDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when name exceeds 200 characters', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'a'.repeat(201);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when description exceeds 1000 characters', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'Valid Name';
    dto.description = 'a'.repeat(1001);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  it('should pass with exactly 200 char name', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'a'.repeat(200);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with exactly 1000 char description', async () => {
    const dto = new CreateProjectDto();
    dto.name = 'Valid';
    dto.description = 'a'.repeat(1000);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is not a string', async () => {
    const dto = new CreateProjectDto();
    (dto as any).name = 123;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });
});
