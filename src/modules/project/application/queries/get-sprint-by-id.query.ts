import { IQuery } from 'src/libs/core/application';

export class GetSprintByIdQuery implements IQuery {
  constructor(public readonly sprintId: string) {}
}
