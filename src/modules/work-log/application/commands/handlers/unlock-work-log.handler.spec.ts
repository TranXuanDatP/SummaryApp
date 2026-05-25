import { UnlockWorkLogHandler } from './unlock-work-log.handler';
import { UnlockWorkLogCommand } from '../unlock-work-log.command';
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

function createLockedWorkLog(employeeId = 'user-1'): WorkLog {
  return WorkLog.reconstitute(
    'worklog-1',
    {
      projectId: 'project-1',
      employeeId,
      executionDate: new Date('2026-05-01'),
      content: 'Locked content',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
    },
    1,
    new Date('2026-05-01'),
    new Date('2026-05-01'),
    null,
  );
}

function createDeletedWorkLog(): WorkLog {
  return WorkLog.reconstitute(
    'worklog-deleted',
    {
      projectId: 'project-1',
      employeeId: 'user-1',
      executionDate: new Date('2026-05-01'),
      content: 'Deleted content',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
    },
    1,
    new Date('2026-05-01'),
    new Date('2026-05-01'),
    new Date('2026-05-02'),
  );
}

describe('UnlockWorkLogHandler', () => {
  let handler: UnlockWorkLogHandler;
  let mockRepository: any;
  let mockProjectReadDao: any;
  let mockUserReadDao: any;
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
    mockProjectReadDao = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'project-1', name: 'Test Project' }),
    };
    mockUserReadDao = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', fullName: 'John Doe' }),
    };

    handler = new UnlockWorkLogHandler(
      mockRepository,
      calculator,
      mockProjectReadDao,
      mockUserReadDao,
    );
  });

  it('should unlock a locked WorkLog', async () => {
    const workLog = createLockedWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UnlockWorkLogCommand(
      'worklog-1',
      'Nhân viên ốm 2 ngày',
      'manager-1',
    );
    const result = await handler.execute(command);

    expect(result.isUnlocked).toBe(true);
    expect(result.unlockedBy).toBe('manager-1');
    expect(result.unlockReason).toBe('Nhân viên ốm 2 ngày');
    expect(result.unlockedAt).toBeDefined();
    expect(result.isEditable).toBe(true);
    expect(result.projectName).toBe('Test Project');
    expect(result.employeeName).toBe('John Doe');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should be idempotent — already unlocked WorkLog returns success', async () => {
    const workLog = WorkLog.reconstitute(
      'worklog-1',
      {
        projectId: 'project-1',
        employeeId: 'user-1',
        executionDate: new Date('2026-05-01'),
        content: 'Already unlocked',
        isUnlocked: true,
        unlockedBy: 'manager-old',
        unlockedAt: new Date('2026-05-10'),
        unlockReason: 'Previous reason',
      },
      2,
      new Date('2026-05-01'),
      new Date('2026-05-10'),
      null,
    );
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UnlockWorkLogCommand(
      'worklog-1',
      'New reason',
      'manager-2',
    );
    const result = await handler.execute(command);

    // Idempotent: keeps original values, no error
    expect(result.isUnlocked).toBe(true);
    expect(result.unlockedBy).toBe('manager-old');
    expect(result.unlockReason).toBe('Previous reason');
  });

  it('should throw WORKLOG_NOT_FOUND when WorkLog does not exist', async () => {
    mockRepository.getById.mockResolvedValue(null);

    const command = new UnlockWorkLogCommand(
      'nonexistent',
      'Reason',
      'manager-1',
    );
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_LOCKED when WorkLog is deleted', async () => {
    const workLog = createDeletedWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UnlockWorkLogCommand(
      'worklog-deleted',
      'Reason',
      'manager-1',
    );
    await expect(handler.execute(command)).rejects.toThrow(
      BusinessRuleException,
    );
    await expect(handler.execute(command)).rejects.toMatchObject({
      code: 'WORKLOG_LOCKED',
    });
  });
});
