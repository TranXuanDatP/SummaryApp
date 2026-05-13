  import { IAggregateRepository } from 'src/libs/core/domain';
import { User } from '../entities';

/**
 * User Repository Interface (Port) - WRITE SIDE ONLY
 *
 * CQRS Note:
 * - This interface is for WRITE operations only
 * - Query operations go through IUserReadDao (Read Side, Story 1.2)
 *
 * Clean Architecture Flow:
 * Domain (IUserRepository) ← Application (Handler) → Infrastructure (UserRepository)
 */
export interface IUserRepository extends IAggregateRepository<User> {
  /**
   * Find user by email (for WRITE side uniqueness check)
   * Read-side queries go through IUserReadDao (created in Story 1.2)
   */
  findByEmail(email: string): Promise<User | null>;
}
