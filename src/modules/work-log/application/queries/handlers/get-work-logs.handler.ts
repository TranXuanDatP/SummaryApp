import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetWorkLogsQuery } from '../get-work-logs.query';
import { WorkLogDto } from '../../dtos';
import { WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';
import { COMMENT_READ_DAO_TOKEN } from '@modules/comment/constants';
import type { ICommentReadDao } from '@modules/comment/application/queries/ports';

@QueryHandler(GetWorkLogsQuery)
export class GetWorkLogsHandler implements IQueryHandler<
  GetWorkLogsQuery,
  { data: WorkLogDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(COMMENT_READ_DAO_TOKEN)
    private readonly commentReadDao: ICommentReadDao,
  ) {}

  async execute(query: GetWorkLogsQuery): Promise<{
    data: WorkLogDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.workLogReadDao.findAll({
      employeeId: query.employeeId,
      projectId: query.projectId,
      executionDate: query.executionDate,
      page: query.page,
      limit: query.limit,
    });

    const workLogIds = data.map((wl) => wl.id);
    const allComments = workLogIds.length > 0
      ? await this.commentReadDao.findByWorkLogIds(workLogIds)
      : [];

    const commentsByWorkLogId = new Map<string, typeof allComments>();
    for (const c of allComments) {
      const list = commentsByWorkLogId.get(c.workLogId) ?? [];
      list.push(c);
      commentsByWorkLogId.set(c.workLogId, list);
    }

    for (const wl of data) {
      wl.comments = commentsByWorkLogId.get(wl.id) ?? [];
    }

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
