import { UpdateWorkLogHandler } from './update-work-log.handler';
import { UpdateWorkLogCommand } from '../update-work-log.command';
import { NotFoundException, BusinessRuleException } from 'src/libs/core/common';
import { WorkLog } from '../../../domain/entities';
import { WorkLogId } from '../../../domain/value-objects';
import type { IBusinessDayCalculator } from '../../../domain/services';

class StubCalculator implements IBusinessDayCalculator {
  isBusinessDay(): boolean {
    return true;
  }
  countBusinessDaysBetween(): number {
    return 0;
  } // 0 = within edit window
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
  } // >3 = outside edit window
}

function createWorkLog(employeeId = 'user-1'): WorkLog {
  return WorkLog.reconstitute(
    'worklog-1',
    {
      projectId: 'project-1',
      employeeId,
      executionDate: new Date('2026-05-18'),
      content: 'Original content',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
      status: 'in_progress',
    },
    1,
    new Date('2026-05-18'),
    new Date('2026-05-18'),
    null,
  );
}

describe('UpdateWorkLogHandler', () => {
  let handler: UpdateWorkLogHandler;
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

    handler = new UpdateWorkLogHandler(
      mockRepository,
      calculator,
      mockProjectReadDao,
      mockUserReadDao,
    );
  });

  it('should update content within edit window', async () => {
    const workLog = createWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UpdateWorkLogCommand(
      'worklog-1',
      'Updated content',
      'user-1',
    );
    const result = await handler.execute(command);

    expect(result.content).toBe('Updated content');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw WORKLOG_NOT_FOUND when WorkLog does not exist', async () => {
    mockRepository.getById.mockResolvedValue(null);

    const command = new UpdateWorkLogCommand(
      'nonexistent',
      'content',
      'user-1',
    );
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_NOT_FOUND for C-7 violation (wrong employee)', async () => {
    const workLog = createWorkLog('other-user');
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UpdateWorkLogCommand(
      'worklog-1',
      'Hack attempt',
      'user-1',
    );
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_LOCKED when outside edit window', async () => {
    const lockedCalc = new LockedCalculator();
    handler = new UpdateWorkLogHandler(
      mockRepository,
      lockedCalc,
      mockProjectReadDao,
      mockUserReadDao,
    );

    const workLog = createWorkLog();
    mockRepository.getById.mockResolvedValue(workLog);

    const command = new UpdateWorkLogCommand('worklog-1', 'Too late', 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(
      BusinessRuleException,
    );
    await expect(handler.execute(command)).rejects.toMatchObject({
      code: 'WORKLOG_LOCKED',
    });
  });

  it('should auto-lock after updating an unlocked WorkLog', async () => {
    const unlockedWorkLog = WorkLog.reconstitute(
      'worklog-1',
      {
        projectId: 'project-1',
        employeeId: 'user-1',
        executionDate: new Date('2026-05-01'),
        content: 'Unlocked content',
        isUnlocked: true,
        unlockedBy: 'manager-1',
        unlockedAt: new Date('2026-05-10'),
        unlockReason: 'Nhân viên ốm',
      status: 'in_progress',
      },
      2,
      new Date('2026-05-01'),
      new Date('2026-05-10'),
      null,
    );
    mockRepository.getById.mockResolvedValue(unlockedWorkLog);

    const command = new UpdateWorkLogCommand(
      'worklog-1',
      'Updated after unlock',
      'user-1',
    );
    const result = await handler.execute(command);

    expect(result.content).toBe('Updated after unlock');
    // Auto-lock should have cleared unlock fields
    expect(result.isUnlocked).toBe(false);
    expect(result.unlockedBy).toBeNull();
    expect(result.unlockedAt).toBeNull();
    expect(result.unlockReason).toBeNull();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
