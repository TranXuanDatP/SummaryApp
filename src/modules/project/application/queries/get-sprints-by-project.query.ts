import { IQuery } from 'src/libs/core/application';

export class GetSprintsByProjectQuery implements IQuery {
  constructor(public readonly projectId: string) {}
}
