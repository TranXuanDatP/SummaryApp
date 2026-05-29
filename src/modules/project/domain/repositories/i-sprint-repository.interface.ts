import { IAggregateRepository } from 'src/libs/core/domain';
import { Sprint } from '../entities';

export interface ISprintRepository extends IAggregateRepository<Sprint> {
  findByProjectId(projectId: string): Promise<Sprint[]>;
}
