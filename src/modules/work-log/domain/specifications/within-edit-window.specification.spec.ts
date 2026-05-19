import { WithinEditWindowSpecification } from './within-edit-window.specification';
import { WorkLog } from '../entities';
import { WorkLogId } from '../value-objects';
import type { IBusinessDayCalculator } from '../services';

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

describe('WithinEditWindowSpecification', () => {
  it('should be satisfied when within edit window', () => {
    const calc = makeCalculator(2);
    const wl = createWorkLog();
    const spec = new WithinEditWindowSpecification(calc);

    expect(spec.isSatisfiedBy(wl)).toBe(true);
  });

  it('should not be satisfied when outside edit window', () => {
    const calc = makeCalculator(5);
    const wl = createWorkLog();
    const spec = new WithinEditWindowSpecification(calc);

    expect(spec.isSatisfiedBy(wl)).toBe(false);
  });

  it('should be satisfied when WorkLog is unlocked', () => {
    const calc = makeCalculator(100);
    const wl = createWorkLog();
    wl.unlock('mgr-1', 'Override');
    const spec = new WithinEditWindowSpecification(calc);

    expect(spec.isSatisfiedBy(wl)).toBe(true);
  });
});
