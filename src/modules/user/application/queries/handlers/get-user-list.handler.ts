import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetUserListQuery } from '../get-user-list.query';
import { UserDto } from '../../dtos';
import { USER_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IUserReadDao } from '../ports';

@QueryHandler(GetUserListQuery)
export class GetUserListHandler implements IQueryHandler<
  GetUserListQuery,
  { data: UserDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
  ) {}

  async execute(query: GetUserListQuery): Promise<{
    data: UserDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.userReadDao.findAll({
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
