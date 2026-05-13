import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetUserQuery } from '../get-user.query';
import { UserDto } from '../../dtos';
import { USER_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IUserReadDao } from '../ports';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserDto> {
  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const user = await this.userReadDao.findById(query.id);
    if (!user) {
      throw NotFoundException.entity('User', query.id);
    }
    return user;
  }
}
