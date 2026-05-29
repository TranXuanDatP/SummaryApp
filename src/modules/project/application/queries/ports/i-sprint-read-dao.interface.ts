import type { SprintDto } from '../../dtos';

export interface ISprintReadDao {
  findById(id: string): Promise<SprintDto | null>;
  findByProjectId(projectId: string): Promise<SprintDto[]>;
}
