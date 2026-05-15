import { validate } from 'class-validator';
import { UpdateProjectDto } from './update-project.dto';

describe('UpdateProjectDto', () => {
  it('should pass with no fields (all optional)', async () => {
    const dto = new UpdateProjectDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid name only', async () => {
    const dto = new UpdateProjectDto();
    dto.name = 'Dự án Beta';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid description only', async () => {
    const dto = new UpdateProjectDto();
    dto.description = 'Mô tả mới';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when name is empty string', async () => {
    const dto = new UpdateProjectDto();
    dto.name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when name exceeds 200 characters', async () => {
    const dto = new UpdateProjectDto();
    dto.name = 'a'.repeat(201);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail when description exceeds 1000 characters', async () => {
    const dto = new UpdateProjectDto();
    dto.description = 'a'.repeat(1001);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });

  it('should pass with exactly 200 char name', async () => {
    const dto = new UpdateProjectDto();
    dto.name = 'a'.repeat(200);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with exactly 1000 char description', async () => {
    const dto = new UpdateProjectDto();
    dto.description = 'a'.repeat(1000);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
