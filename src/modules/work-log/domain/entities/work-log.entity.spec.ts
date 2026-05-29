import { WorkLog, WorkLogProps } from './work-log.entity';
import { WorkLogId } from '../value-objects';
import { DomainException } from 'src/libs/core/domain';
import type { IBusinessDayCalculator } from '../services';

function makeCalculator(bizDays: number): IBusinessDayCalculator {
  return {
    isBusinessDay: () => true,
    countBusinessDaysBetween: () => bizDays,
    addBusinessDays: (d: Date) => d,
    getEditWindowClosesAt: (d: Date) => d,
  };
}

const calcWithinWindow = makeCalculator(0);
const calcOutsideWindow = makeCalculator(5);

function createWorkLog(): WorkLog {
  return WorkLog.create(
    new WorkLogId('worklog-1'),
    {
      projectId: 'project-1',
      employeeId: 'employee-1',
      executionDate: new Date(),
      content: 'Did some work',
    },
    calcWithinWindow,
  );
}

function createWorkLogOutsideWindow(): WorkLog {
  return WorkLog.reconstitute(
    'worklog-old',
    {
      projectId: 'project-1',
      employeeId: 'employee-1',
      executionDate: new Date('2026-01-01'),
      content: 'Old work',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
      status: 'in_progress',
    },
    1,
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );
}

describe('WorkLog Entity', () => {
  describe('create', () => {
    it('should create a valid WorkLog', () => {
      const wl = createWorkLog();

      expect(wl.id).toBe('worklog-1');
      expect(wl.projectId).toBe('project-1');
      expect(wl.employeeId).toBe('employee-1');
      expect(wl.content).toBe('Did some work');
      expect(wl.isUnlocked).toBe(false);
      expect(wl.unlockedBy).toBeNull();
      expect(wl.unlockedAt).toBeNull();
      expect(wl.unlockReason).toBeNull();
      expect(wl.isDeleted).toBe(false);
    });

    it('should emit WorkLogCreatedEvent', () => {
      const wl = createWorkLog();
      const events = wl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('WorkLogCreated');
      expect(events[0].data).toEqual({
        projectId: 'project-1',
        employeeId: 'employee-1',
        executionDate: expect.any(String),
        content: 'Did some work',
      });
    });

    it('should reject empty content', () => {
      expect(() =>
        WorkLog.create(
          new WorkLogId('wl-1'),
          {
            projectId: 'p-1',
            employeeId: 'e-1',
            executionDate: new Date(),
            content: '',
          },
          calcWithinWindow,
        ),
      ).toThrow(DomainException);
    });

    it('should reject whitespace-only content', () => {
      expect(() =>
        WorkLog.create(
          new WorkLogId('wl-1'),
          {
            projectId: 'p-1',
            employeeId: 'e-1',
            executionDate: new Date(),
            content: '   ',
          },
          calcWithinWindow,
        ),
      ).toThrow('content is required');
    });

    it('should reject content exceeding 5000 characters', () => {
      expect(() =>
        WorkLog.create(
          new WorkLogId('wl-1'),
          {
            projectId: 'p-1',
            employeeId: 'e-1',
            executionDate: new Date(),
            content: 'a'.repeat(5001),
          },
          calcWithinWindow,
        ),
      ).toThrow('cannot exceed 5000');
    });

    it('should accept content at exactly 5000 characters', () => {
      const wl = WorkLog.create(
        new WorkLogId('wl-1'),
        {
          projectId: 'p-1',
          employeeId: 'e-1',
          executionDate: new Date(),
          content: 'a'.repeat(5000),
        },
        calcWithinWindow,
      );
      expect(wl.content).toHaveLength(5000);
    });

    it('should trim content', () => {
      const wl = WorkLog.create(
        new WorkLogId('wl-1'),
        {
          projectId: 'p-1',
          employeeId: 'e-1',
          executionDate: new Date(),
          content: '  hello world  ',
        },
        calcWithinWindow,
      );
      expect(wl.content).toBe('hello world');
    });

    it('should reject empty projectId', () => {
      expect(() =>
        WorkLog.create(
          new WorkLogId('wl-1'),
          {
            projectId: '',
            employeeId: 'e-1',
            executionDate: new Date(),
            content: 'Work',
          },
          calcWithinWindow,
        ),
      ).toThrow('Project ID is required');
    });

    it('should reject empty employeeId', () => {
      expect(() =>
        WorkLog.create(
          new WorkLogId('wl-1'),
          {
            projectId: 'p-1',
            employeeId: '',
            executionDate: new Date(),
            content: 'Work',
          },
          calcWithinWindow,
        ),
      ).toThrow('Employee ID is required');
    });

    it('should defensive-copy executionDate', () => {
      const date = new Date();
      const wl = WorkLog.create(
        new WorkLogId('wl-1'),
        {
          projectId: 'p-1',
          employeeId: 'e-1',
          executionDate: date,
          content: 'Work',
        },
        calcWithinWindow,
      );
      date.setFullYear(2030);
      expect(wl.executionDate.getFullYear()).not.toBe(2030);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute without events or validation', () => {
      const props: WorkLogProps = {
        projectId: 'p-1',
        employeeId: 'e-1',
        executionDate: new Date('2026-01-01'),
        content: 'Past work',
        isUnlocked: false,
        unlockedBy: null,
        unlockedAt: null,
        unlockReason: null,
      status: 'in_progress',
      };
      const wl = WorkLog.reconstitute('wl-1', props, 1, new Date(), new Date());

      expect(wl.id).toBe('wl-1');
      expect(wl.content).toBe('Past work');
      expect(wl.version).toBe(1);
      expect(wl.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('updateContent', () => {
    it('should update content within edit window', () => {
      const wl = createWorkLog();
      wl.clearDomainEvents();

      wl.updateContent('Updated content', calcWithinWindow);

      expect(wl.content).toBe('Updated content');
      const events = wl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('WorkLogUpdated');
    });

    it('should reject update outside edit window when not unlocked', () => {
      const wl = createWorkLogOutsideWindow();

      expect(() => wl.updateContent('Nope', calcOutsideWindow)).toThrow(
        DomainException,
      );
      expect(() => wl.updateContent('Nope', calcOutsideWindow)).toThrow(
        'locked',
      );
    });

    it('should allow update outside edit window when unlocked', () => {
      const wl = createWorkLogOutsideWindow();
      wl.unlock('manager-1', 'Employee was sick');
      wl.clearDomainEvents();

      expect(() =>
        wl.updateContent('Fixed content', calcOutsideWindow),
      ).not.toThrow();
      expect(wl.content).toBe('Fixed content');
    });

    it('should reject empty content on update', () => {
      const wl = createWorkLog();

      expect(() => wl.updateContent('', calcWithinWindow)).toThrow(
        'content is required',
      );
    });

    it('should reject content exceeding max length on update', () => {
      const wl = createWorkLog();

      expect(() =>
        wl.updateContent('a'.repeat(5001), calcWithinWindow),
      ).toThrow('cannot exceed 5000');
    });

    it('should reject update on deleted WorkLog', () => {
      const wl = createWorkLog();
      wl.delete(calcWithinWindow);

      expect(() => wl.updateContent('Nope', calcWithinWindow)).toThrow(
        'deleted',
      );
    });
  });

  describe('delete', () => {
    it('should soft delete within edit window', () => {
      const wl = createWorkLog();
      wl.clearDomainEvents();

      wl.delete(calcWithinWindow);

      expect(wl.isDeleted).toBe(true);
      expect(wl.deletedAt).toBeTruthy();
      const events = wl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('WorkLogDeleted');
    });

    it('should reject delete outside edit window when not unlocked', () => {
      const wl = createWorkLogOutsideWindow();

      expect(() => wl.delete(calcOutsideWindow)).toThrow('locked');
      expect(wl.isDeleted).toBe(false);
    });

    it('should allow delete outside edit window when unlocked', () => {
      const wl = createWorkLogOutsideWindow();
      wl.unlock('manager-1', 'Emergency fix');

      expect(() => wl.delete(calcOutsideWindow)).not.toThrow();
      expect(wl.isDeleted).toBe(true);
    });

    it('should reject delete on already deleted WorkLog', () => {
      const wl = createWorkLog();
      wl.delete(calcWithinWindow);

      expect(() => wl.delete(calcWithinWindow)).toThrow('deleted');
    });
  });

  describe('unlock', () => {
    it('should set unlock fields and emit event', () => {
      const wl = createWorkLog();
      wl.clearDomainEvents();

      wl.unlock('manager-1', 'Employee was sick');

      expect(wl.isUnlocked).toBe(true);
      expect(wl.unlockedBy).toBe('manager-1');
      expect(wl.unlockedAt).toBeTruthy();
      expect(wl.unlockReason).toBe('Employee was sick');

      const events = wl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('WorkLogUnlocked');
      expect(events[0].data).toEqual({
        unlockedBy: 'manager-1',
        unlockedAt: expect.any(String),
        unlockReason: 'Employee was sick',
      });
    });

    it('should require non-empty reason', () => {
      const wl = createWorkLog();

      expect(() => wl.unlock('manager-1', '')).toThrow('reason is required');
      expect(() => wl.unlock('manager-1', '   ')).toThrow('reason is required');
    });

    it('should require non-empty unlockedBy', () => {
      const wl = createWorkLog();

      expect(() => wl.unlock('', 'Some reason')).toThrow(
        'identity is required',
      );
      expect(() => wl.unlock('   ', 'Some reason')).toThrow(
        'identity is required',
      );
    });

    it('should be idempotent — skip if already unlocked', () => {
      const wl = createWorkLog();
      wl.unlock('manager-1', 'First reason');
      wl.clearDomainEvents();

      wl.unlock('manager-2', 'Second reason');

      expect(wl.unlockedBy).toBe('manager-1');
      expect(wl.unlockReason).toBe('First reason');
      expect(wl.getDomainEvents()).toHaveLength(0);
    });

    it('should reject unlock on deleted WorkLog', () => {
      const wl = createWorkLog();
      wl.delete(calcWithinWindow);

      expect(() => wl.unlock('manager-1', 'reason')).toThrow('deleted');
    });
  });

  describe('lock', () => {
    it('should reset unlock fields and clear audit trail', () => {
      const wl = createWorkLog();
      wl.unlock('manager-1', 'Reason');
      expect(wl.isUnlocked).toBe(true);

      wl.lock();

      expect(wl.isUnlocked).toBe(false);
      expect(wl.unlockedBy).toBeNull();
      expect(wl.unlockedAt).toBeNull();
      expect(wl.unlockReason).toBeNull();
    });

    it('should be idempotent on already locked WorkLog', () => {
      const wl = createWorkLog();
      expect(wl.isUnlocked).toBe(false);

      wl.lock();

      expect(wl.isUnlocked).toBe(false);
    });
  });

  describe('isWithinEditWindow', () => {
    it('should return true when within 3 business days', () => {
      const wl = createWorkLog();

      expect(wl.isWithinEditWindow(calcWithinWindow)).toBe(true);
    });

    it('should return false when beyond 3 business days', () => {
      const wl = createWorkLogOutsideWindow();

      expect(wl.isWithinEditWindow(calcOutsideWindow)).toBe(false);
    });

    it('should return true when unlocked regardless of window', () => {
      const wl = createWorkLogOutsideWindow();
      wl.unlock('manager-1', 'Override');

      expect(wl.isWithinEditWindow(calcOutsideWindow)).toBe(true);
    });
  });

  describe('executionDate defensive copy', () => {
    it('should return a copy from getter to prevent external mutation', () => {
      const wl = createWorkLog();
      const dateRef = wl.executionDate;
      dateRef.setFullYear(2030);
      expect(wl.executionDate.getFullYear()).not.toBe(2030);
    });
  });
});
