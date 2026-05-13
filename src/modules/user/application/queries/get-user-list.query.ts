import { IQuery } from 'src/libs/core/application';
import { UserDto } from '../dtos';

export class GetUserListQuery extends IQuery<{
  data: UserDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
  }
}
