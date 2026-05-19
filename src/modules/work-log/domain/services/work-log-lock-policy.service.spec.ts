import { WorkLogLockPolicy } from './work-log-lock-policy.service';
import { WorkLog } from '../entities';
import { WorkLogId } from '../value-objects';
import type { IBusinessDayCalculator } from './business-day-calculator.interface';

function makeCalculator(bizDays: number): IBusinessDayCalculator {
  return {
    isBusinessDay: () => true,
    countBusinessDaysBetween: () => bizDays,
    addBusinessDays: (d: Date) => d,
    getEditWindowClosesAt: (d: Date) => d,
  };
}

function createWorkLog(): WorkLog {
  const calc = makeCalculator(0);
  return WorkLog.create(
    new WorkLogId('wl-1'),
    {
      projectId: 'p-1',
      employeeId: 'e-1',
      executionDate: new Date(),
      content: 'Work',
    },
    calc,
  );
}

describe('WorkLogLockPolicy', () => {
  it('should return true when within edit window', () => {
    const calc = makeCalculator(2);
    const wl = createWorkLog();
    const policy = new WorkLogLockPolicy();

    expect(policy.isEditable(wl, calc)).toBe(true);
  });

  it('should return false when outside edit window and not unlocked', () => {
    const calc = makeCalculator(5);
    const wl = createWorkLog();
    const policy = new WorkLogLockPolicy();

    expect(policy.isEditable(wl, calc)).toBe(false);
  });

  it('should return true when unlocked regardless of window', () => {
    const calc = makeCalculator(100);
    const wl = createWorkLog();
    wl.unlock('mgr-1', 'Override');
    const policy = new WorkLogLockPolicy();

    expect(policy.isEditable(wl, calc)).toBe(true);
  });
});
