import { CreateWorkLogHandler } from './create-work-log.handler';
import { CreateWorkLogCommand } from '../create-work-log.command';
import { WorkLog } from '../../../domain/entities';
import { WorkLogId } from '../../../domain/value-objects';
import {
  ConflictException,
  NotFoundException,
  BusinessRuleException,
} from 'src/libs/core/common';
import type { IBusinessDayCalculator } from '../../../domain/services';

// Stub calculator — all dates are within edit window
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

// Stub calculator that rejects future dates
class FutureDateRejectingCalculator extends StubCalculator {
  countBusinessDaysBetween(_start?: Date, _end?: Date): number {
    return 999;
  }
}

describe('CreateWorkLogHandler', () => {
  let handler: CreateWorkLogHandler;
  let mockRepository: any;
  let mockReadDao: any;
  let mockProjectReadDao: any;
  let mockUserReadDao: any;
  let mockSprintReadDao: any;
  let calculator: IBusinessDayCalculator;

  beforeEach(() => {
    calculator = new StubCalculator();
    mockRepository = {
      save: jest.fn().mockImplementation((agg: any) => {
        agg.incrementVersion();
        return Promise.resolve(agg);
      }),
      getById: jest.fn().mockResolvedValue(null),
    };
    mockReadDao = {
      findById: jest.fn().mockResolvedValue(null),
      findByProjectAndEmployeeAndDate: jest.fn().mockResolvedValue(null),
      findMostRecentByEmployee: jest.fn().mockResolvedValue(null),
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
    mockSprintReadDao = {
      findById: jest.fn().mockResolvedValue(null),
    };

    handler = new CreateWorkLogHandler(
      mockRepository,
      calculator,
      mockReadDao,
      mockProjectReadDao,
      mockUserReadDao,
      mockSprintReadDao,
    );
  });

  it('should create WorkLog with all fields provided', async () => {
    const command = new CreateWorkLogCommand(
      'Did some work',
      'project-1',
      'user-1',
      new Date(),
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.content).toBe('Did some work');
    expect(result.projectId).toBe('project-1');
    expect(result.employeeId).toBe('user-1');
    expect(result.projectName).toBe('Test Project');
    expect(result.employeeName).toBe('John Doe');
    expect(result.isEditable).toBe(true);
    expect(result.editWindowClosesAt).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should use smart default projectId from most recent WorkLog', async () => {
    mockReadDao.findMostRecentByEmployee.mockResolvedValue({
      projectId: 'recent-project',
    });
    mockProjectReadDao.findById.mockResolvedValue({
      id: 'recent-project',
      name: 'Recent Project',
    });

    const command = new CreateWorkLogCommand(
      'More work',
      null,
      'user-1',
      new Date(),
    );

    const result = await handler.execute(command);
    expect(result.projectId).toBe('recent-project');
    expect(result.projectName).toBe('Recent Project');
  });

  it('should throw WORKLOG_PROJECT_REQUIRED when no projectId and no history', async () => {
    const command = new CreateWorkLogCommand(
      'Work without project',
      null,
      'user-1',
      new Date(),
    );

    await expect(handler.execute(command)).rejects.toThrow(
      BusinessRuleException,
    );
    await expect(handler.execute(command)).rejects.toMatchObject({
      code: 'WORKLOG_PROJECT_REQUIRED',
    });
  });

  it('should throw PROJECT_NOT_FOUND when project does not exist', async () => {
    mockProjectReadDao.findById.mockResolvedValue(null);

    const command = new CreateWorkLogCommand(
      'Work on missing project',
      'nonexistent',
      'user-1',
      new Date(),
    );

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw WORKLOG_DUPLICATE when duplicate detected', async () => {
    mockReadDao.findByProjectAndEmployeeAndDate.mockResolvedValue({
      id: 'existing-log',
      projectId: 'project-1',
    });

    const command = new CreateWorkLogCommand(
      'Duplicate work',
      'project-1',
      'user-1',
      new Date(),
    );

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should default executionDate to today when null', async () => {
    const command = new CreateWorkLogCommand(
      'Today work',
      'project-1',
      'user-1',
      null,
    );

    const result = await handler.execute(command);
    expect(result).toBeDefined();
    // executionDate should be set (today)
    expect(result.executionDate).toBeDefined();
  });
});
