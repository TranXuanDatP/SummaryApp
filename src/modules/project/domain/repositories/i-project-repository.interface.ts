import { IAggregateRepository } from 'src/libs/core/domain';
import { Project } from '../entities';

export interface IProjectRepository extends IAggregateRepository<Project> {
  findByName(name: string): Promise<Project | null>;
}
