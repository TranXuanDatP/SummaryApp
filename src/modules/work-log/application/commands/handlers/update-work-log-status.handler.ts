import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import {
  NotFoundException,
  ForbiddenException,
  BusinessRuleException,
  DomainException,
} from 'src/libs/core/common';
import { DomainErrorCode } from 'src/libs/core/domain';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UpdateWorkLogStatusCommand } from '../update-work-log-status.command';
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
import { SPRINT_READ_DAO_TOKEN } from '@modules/sprint/constants/tokens';
import type { ISprintReadDao } from '@modules/sprint/application/queries/ports';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';

@CommandHandler(UpdateWorkLogStatusCommand)
export class UpdateWorkLogStatusHandler implements ICommandHandler<
  UpdateWorkLogStatusCommand,
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
    @Inject(SPRINT_READ_DAO_TOKEN)
    private readonly sprintReadDao: ISprintReadDao,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateWorkLogStatusCommand): Promise<WorkLogDto> {
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

    if (workLog.employeeId !== command.employeeId) {
      throw ForbiddenException.resourceAccessDenied(
        'WorkLog',
        command.id,
        command.employeeId,
      );
    }

    try {
      if (command.status === 'done') {
        workLog.markDone(eventMetadata);
      } else {
        workLog.reopen(eventMetadata);
      }
    } catch (error) {
      if (error instanceof DomainException) {
        throw new BusinessRuleException(error.message, error.code, {
          suggestion: 'Không thể cập nhật trạng thái',
        });
      }
      throw error;
    }

    await this.repository.save(workLog);

    return this.buildDto(workLog);
  }

  private async buildDto(workLog: WorkLog): Promise<WorkLogDto> {
    const [project, employee, sprint] = await Promise.all([
      this.projectReadDao.findById(workLog.projectId),
      this.userReadDao.findById(workLog.employeeId),
      workLog.sprintId ? this.sprintReadDao.findById(workLog.sprintId) : Promise.resolve(null),
    ]);

    return new WorkLogDto({
      id: workLog.id,
      projectId: workLog.projectId,
      employeeId: workLog.employeeId,
      sprintId: workLog.sprintId,
      executionDate: workLog.executionDate.toISOString(),
      content: workLog.content,
      workType: workLog.workType,
      status: workLog.status,
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
      sprintName: sprint?.name ?? null,
      createdAt: workLog.createdAt,
      updatedAt: workLog.updatedAt,
    });
  }
}
