import { ProjectDto } from '../../dtos';

export interface IProjectReadDao {
  findById(id: string): Promise<ProjectDto | null>;

  findAll(params: {
    page: number;
    limit: number;
  }): Promise<{ data: ProjectDto[]; total: number }>;

  findByName(name: string): Promise<ProjectDto | null>;

  search(params: {
    query: string;
    page: number;
    limit: number;
  }): Promise<{ data: ProjectDto[]; total: number }>;
}
