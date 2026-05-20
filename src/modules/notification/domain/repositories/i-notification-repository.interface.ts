import type { IAggregateRepository } from 'src/libs/core/domain';
import type { Notification } from '../entities';

export interface INotificationRepository extends IAggregateRepository<Notification> {}
