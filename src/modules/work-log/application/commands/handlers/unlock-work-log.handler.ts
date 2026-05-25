import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import {
  NotFoundException,
  BusinessRuleException,
  DomainException,
} from 'src/libs/core/common';
import { DomainErrorCode } from 'src/libs/core/domain';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UnlockWorkLogCommand } from '../unlock-work-log.command';
import { WorkLogDto } from '../../dtos';
import type { IWorkLogRepository } from '../../../domain/repositories';
import type { IBusinessDayCalculator } from '../../../domain/services';
import { WorkLog } from '../../../domain/entities';
import {
  WORK_LOG_REPOSITORY_TOKEN,
  BUSINESS_DAY_CALCULATOR_TOKEN,
} from '../../../constants/tokens';
import { PROJECT_READ_DAO_TOKEN } from '@modules/project/constants/tokens';
import type { IProjectReadDao } from '@modules/project/application/queries/ports';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';

@CommandHandler(UnlockWorkLogCommand)
export class UnlockWorkLogHandler implements ICommandHandler<
  UnlockWorkLogCommand,
  WorkLogDto
> {
  constructor(
    @Inject(WORK_LOG_REPOSITORY_TOKEN)
    private readonly repository: IWorkLogRepository,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UnlockWorkLogCommand): Promise<WorkLogDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const workLog = await this.repository.getById(command.id);
    if (!workLog) {
      throw NotFoundException.entity('WorkLog', command.id, {
        suggestion: 'Kiểm tra lại ID WorkLog',
      });
    }

    try {
      workLog.unlock(command.managerId, command.reason, eventMetadata);
    } catch (error) {
      if (error instanceof DomainException) {
        if (error.code === DomainErrorCode.WORKLOG_ALREADY_DELETED) {
          throw new BusinessRuleException(
            'Cannot unlock a deleted WorkLog',
            'WORKLOG_LOCKED',
            { suggestion: 'WorkLog đã bị xóa, không thể mở khóa' },
          );
        }
      }
      throw error;
    }

    await this.repository.save(workLog);

    return this.buildDto(workLog);
  }

  private async buildDto(workLog: WorkLog): Promise<WorkLogDto> {
    const [project, employee] = await Promise.all([
      this.projectReadDao.findById(workLog.projectId),
      this.userReadDao.findById(workLog.employeeId),
    ]);

    return new WorkLogDto({
      id: workLog.id,
      projectId: workLog.projectId,
      employeeId: workLog.employeeId,
      executionDate: workLog.executionDate.toISOString(),
      content: workLog.content,
      isUnlocked: workLog.isUnlocked,
      unlockedBy: workLog.unlockedBy,
      unlockedAt: workLog.unlockedAt?.toISOString() ?? null,
      unlockReason: workLog.unlockReason,
      version: workLog.version,
      isEditable: workLog.isWithinEditWindow(this.calculator),
      editWindowClosesAt: this.calculator
        .getEditWindowClosesAt(workLog.executionDate)
        .toISOString(),
      projectName: project?.name ?? '',
      employeeName: employee?.fullName ?? '',
      createdAt: workLog.createdAt,
      updatedAt: workLog.updatedAt,
    });
  }
}
