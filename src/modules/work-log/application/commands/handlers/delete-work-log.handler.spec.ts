import { DeleteWorkLogHandler } from './delete-work-log.handler';
import { DeleteWorkLogCommand } from '../delete-work-log.command';
import { NotFoundException, BusinessRuleException } from 'src/libs/core/common';
import { WorkLog } from '../../../domain/entities';
import type { IBusinessDayCalculator } from '../../../domain/services';

class StubCalculator implements IBusinessDayCalculator {
  isBusinessDay(): boolean {
    return true;
  }
  countBusinessDaysBetween(): number {
    return 0;
  }
  addBusinessDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  getEditWindowClosesAt(executionDate: Date): Date {
    return this.addBusinessDays(executionDate, 3);
  }
}

class LockedCalculator extends StubCalculator {
  countBusinessDaysBetween(): number {
    return 10;
  }
}

function createWorkLog(employeeId = 'user-1'): WorkLog {
  return WorkLog.reconstitute(
    'worklog-1',
    {
      projectId: 'project-1',
      employeeId,
      executionDate: new Date('2026-05-18'),
      content: 'Content to delete',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
    },
    1,
    new Date('2026-05-18'),
    new Date('2026-05-18'),
    null,
  );
}

describe('DeleteWorkLogHandler', () => {
  let handler: DeleteWorkLogHandler;
  let mockRepository: any;
  let calculator: IBusinessDayCalculator;

  beforeEach(() => {
    calculator = new StubCalculator();
    mockRepository = {
      save: jest.fn().mockImplementation((agg: any) => {
        agg.incrementVersion();
        return Promise.resolve(agg);
      }),
      getById: jest.fn(),
    };

    handler = new DeleteWorkLogHandler(mockRepository, calculator);
  });

  // --- Employee path ---

  it('should soft-delete within edit window (employee)', async () => {
    const workLog = createWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new DeleteWorkLogCommand('worklog-1', 'user-1', 'employee');
    const result = await handler.execute(command);

    expect(result).toEqual({ deleted: true, id: 'worklog-1' });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw WORKLOG_NOT_FOUND when WorkLog does not exist', async () => {
    mockRepository.getById.mockResolvedValue(null);

    const command = new DeleteWorkLogCommand(
      'nonexistent',
      'user-1',
      'employee',
    );
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_NOT_FOUND for C-7 violation (wrong employee)', async () => {
    const workLog = createWorkLog('other-user');
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new DeleteWorkLogCommand('worklog-1', 'user-1', 'employee');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_LOCKED when outside edit window (employee)', async () => {
    const lockedCalc = new LockedCalculator();
    handler = new DeleteWorkLogHandler(mockRepository, lockedCalc);

    const workLog = createWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new DeleteWorkLogCommand('worklog-1', 'user-1', 'employee');
    await expect(handler.execute(command)).rejects.toThrow(
      BusinessRuleException,
    );
    await expect(handler.execute(command)).rejects.toMatchObject({
      code: 'WORKLOG_LOCKED',
    });
  });

  it('should auto-lock after deleting an unlocked WorkLog (employee)', async () => {
    const unlockedWorkLog = WorkLog.reconstitute(
      'worklog-1',
      {
        projectId: 'project-1',
        employeeId: 'user-1',
        executionDate: new Date('2026-05-18'),
        content: 'Unlocked to delete',
        isUnlocked: true,
        unlockedBy: 'manager-1',
        unlockedAt: new Date('2026-05-20'),
        unlockReason: 'Emergency',
      },
      2,
      new Date('2026-05-18'),
      new Date('2026-05-20'),
      null,
    );
    mockRepository.getById.mockResolvedValue(unlockedWorkLog);

    const command = new DeleteWorkLogCommand('worklog-1', 'user-1', 'employee');
    const result = await handler.execute(command);

    expect(result).toEqual({ deleted: true, id: 'worklog-1' });
    expect(mockRepository.save).toHaveBeenCalled();
    const savedWorkLog = mockRepository.save.mock.calls[0][0];
    expect(savedWorkLog.isUnlocked).toBe(false);
    expect(savedWorkLog.unlockedBy).toBeNull();
    expect(savedWorkLog.unlockReason).toBeNull();
  });

  // --- Manager path ---

  it('should delete any work log bypassing ownership check (manager)', async () => {
    const workLog = createWorkLog('other-user');
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new DeleteWorkLogCommand(
      'worklog-1',
      'manager-1',
      'manager',
    );
    const result = await handler.execute(command);

    expect(result).toEqual({ deleted: true, id: 'worklog-1' });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should delete locked work log bypassing lock check (manager)', async () => {
    const lockedCalc = new LockedCalculator();
    handler = new DeleteWorkLogHandler(mockRepository, lockedCalc);

    const workLog = createWorkLog('other-user');
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new DeleteWorkLogCommand(
      'worklog-1',
      'manager-1',
      'manager',
    );
    const result = await handler.execute(command);

    expect(result).toEqual({ deleted: true, id: 'worklog-1' });
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
