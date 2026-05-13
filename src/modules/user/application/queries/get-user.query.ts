import { IQuery } from 'src/libs/core/application';
import { UserDto } from '../dtos';

export class GetUserQuery extends IQuery<UserDto> {
  constructor(public readonly id: string) {
    super();
  }
}
