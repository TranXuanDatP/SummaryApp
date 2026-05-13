import { UserDto } from '../../dtos';

/**
 * User Read DAO Interface (Port)
 *
 * READ SIDE ONLY - all query operations go here.
 * Write operations go through IUserRepository (Write Side).
 */
export interface IUserReadDao {
  findById(id: string): Promise<UserDto | null>;

  findAll(params: {
    page: number;
    limit: number;
  }): Promise<{ data: UserDto[]; total: number }>;

  findByEmail(email: string): Promise<UserDto | null>;
}
