import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { ConflictException, NotFoundException, BusinessRuleException, DomainException } from 'src/libs/core/common';
import { DomainErrorCode } from 'src/libs/core/domain';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CreateWorkLogCommand } from '../create-work-log.command';
import { WorkLogDto } from '../../dtos';
import type { IWorkLogRepository } from '../../../domain/repositories';
import type { IBusinessDayCalculator } from '../../../domain/services';
import { WorkLogId } from '../../../domain/value-objects';
import { WorkLog } from '../../../domain/entities';
import { WORK_LOG_REPOSITORY_TOKEN, BUSINESS_DAY_CALCULATOR_TOKEN, WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../../queries/ports';
import { PROJECT_READ_DAO_TOKEN } from '@modules/project/constants/tokens';
import type { IProjectReadDao } from '@modules/project/application/queries/ports';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';

@CommandHandler(CreateWorkLogCommand)
export class CreateWorkLogHandler implements ICommandHandler<CreateWorkLogCommand, WorkLogDto> {
  constructor(
    @Inject(WORK_LOG_REPOSITORY_TOKEN)
    private readonly repository: IWorkLogRepository,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateWorkLogCommand): Promise<WorkLogDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
      : undefined;

    // 1. Resolve defaults
    let projectId = command.projectId;
    if (!projectId) {
      const recent = await this.workLogReadDao.findMostRecentByEmployee(command.employeeId);
      if (!recent) {
        throw new BusinessRuleException(
          'Project ID is required for first WorkLog',
          'WORKLOG_PROJECT_REQUIRED',
          { suggestion: 'Vui lòng chọn dự án cho WorkLog đầu tiên' },
        );
      }
      projectId = recent.projectId;
    }

    const executionDate = command.executionDate ?? new Date();
    // Normalize to midnight for consistent date comparison and storage
    executionDate.setHours(0, 0, 0, 0);

    // 2. Validate project exists
    const project = await this.projectReadDao.findById(projectId);
    if (!project) {
      throw NotFoundException.entity('Project', projectId, {
        suggestion: 'Kiểm tra lại ID dự án',
      });
    }

    // 3. Duplicate check (C-3)
    const existing = await this.workLogReadDao.findByProjectAndEmployeeAndDate(
      projectId,
      command.employeeId,
      executionDate,
    );
    if (existing) {
      throw ConflictException.duplicate('WorkLog', 'project+employee+date', `${projectId}/${command.employeeId}`, {
        code: 'WORKLOG_DUPLICATE',
        suggestion: 'Bạn đã ghi nhận công việc cho dự án này trong ngày này rồi',
      });
    }

    // 4. Create domain entity (validates future date + lookback via ExecutionDate VO)
    let workLog: WorkLog;
    try {
      workLog = WorkLog.create(
        new WorkLogId(randomUUID()),
        { projectId, employeeId: command.employeeId, executionDate, content: command.content },
        this.calculator,
        eventMetadata,
      );
    } catch (error) {
      if (error instanceof DomainException) {
        if (error.code === DomainErrorCode.WORKLOG_FUTURE_DATE) {
          throw new BusinessRuleException(
            'Execution date cannot be in the future',
            'WORKLOG_FUTURE_DATE',
            { suggestion: 'Chỉ được ghi nhận công việc đã thực hiện' },
          );
        }
        if (error.code === DomainErrorCode.WORKLOG_LOOKBACK_EXCEEDED) {
          throw new BusinessRuleException(
            'Execution date is beyond 3 business day lookback window',
            'WORKLOG_EDIT_WINDOW_EXPIRED',
            { suggestion: 'Chỉ được tạo WorkLog trong vòng 3 ngày làm việc' },
          );
        }
        throw error;
      }
      throw error;
    }

    // 5. Save
    try {
      await this.repository.save(workLog);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw ConflictException.duplicate('WorkLog', 'project+employee+date', '', {
          code: 'WORKLOG_DUPLICATE',
          suggestion: 'Bạn đã ghi nhận công việc cho dự án này trong ngày này rồi',
        });
      }
      throw error;
    }

    // 6. Build response DTO
    const employee = await this.userReadDao.findById(command.employeeId);

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
      editWindowClosesAt: this.calculator.getEditWindowClosesAt(workLog.executionDate).toISOString(),
      projectName: project.name,
      employeeName: employee?.fullName ?? '',
      createdAt: workLog.createdAt,
      updatedAt: workLog.updatedAt,
    });
  }
}
