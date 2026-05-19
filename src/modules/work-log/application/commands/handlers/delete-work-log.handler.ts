import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { NotFoundException, BusinessRuleException, DomainException } from 'src/libs/core/common';
import { DomainErrorCode } from 'src/libs/core/domain';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeleteWorkLogCommand } from '../delete-work-log.command';
import type { IWorkLogRepository } from '../../../domain/repositories';
import type { IBusinessDayCalculator } from '../../../domain/services';
import { WORK_LOG_REPOSITORY_TOKEN, BUSINESS_DAY_CALCULATOR_TOKEN } from '../../../constants/tokens';

@CommandHandler(DeleteWorkLogCommand)
export class DeleteWorkLogHandler implements ICommandHandler<DeleteWorkLogCommand, { deleted: boolean; id: string }> {
  constructor(
    @Inject(WORK_LOG_REPOSITORY_TOKEN)
    private readonly repository: IWorkLogRepository,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeleteWorkLogCommand): Promise<{ deleted: boolean; id: string }> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
      : undefined;

    const workLog = await this.repository.getById(command.id);
    if (!workLog) {
      throw NotFoundException.entity('WorkLog', command.id, {
        suggestion: 'Kiểm tra lại ID WorkLog',
      });
    }

    // C-7: Employee ownership check — return 404, not 403
    if (workLog.employeeId !== command.employeeId) {
      throw NotFoundException.entity('WorkLog', command.id, {
        suggestion: 'Kiểm tra lại ID WorkLog',
      });
    }

    const wasUnlocked = workLog.isUnlocked;

    try {
      workLog.delete(this.calculator, eventMetadata);
    } catch (error) {
      if (error instanceof DomainException && error.code === DomainErrorCode.WORKLOG_LOCKED) {
        throw new BusinessRuleException(
          'WorkLog is locked and cannot be deleted',
          'WORKLOG_LOCKED',
          { suggestion: 'Liên hệ quản lý để mở khóa' },
        );
      }
      throw error;
    }

    // Auto-lock after employee deletes unlocked WorkLog (AC #8)
    if (wasUnlocked) {
      workLog.lock();
    }

    await this.repository.save(workLog);
    return { deleted: true, id: command.id };
  }
}
