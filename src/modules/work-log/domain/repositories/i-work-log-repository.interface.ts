import { IAggregateRepository } from 'src/libs/core/domain';
import { WorkLog } from '../entities';

export interface IWorkLogRepository extends IAggregateRepository<WorkLog> {
  findByProjectId(projectId: string): Promise<WorkLog[]>;
}
