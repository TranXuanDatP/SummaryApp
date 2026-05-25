import { ExecutionDate } from './execution-date.value-object';
import { DomainException } from 'src/libs/core/domain';
import type { IBusinessDayCalculator } from '../services';

function makeCalculator(
  overrides: Partial<IBusinessDayCalculator> = {},
): IBusinessDayCalculator {
  return {
    isBusinessDay: () => true,
    countBusinessDaysBetween: () => 0,
    addBusinessDays: (d: Date) => d,
    getEditWindowClosesAt: (d: Date) => d,
    ...overrides,
  };
}

describe('ExecutionDate', () => {
  it('should create with today date and calculator', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const calc = makeCalculator({ countBusinessDaysBetween: () => 0 });
    const ed = new ExecutionDate(today, calc);
    expect(ed.value.getTime()).toBe(today.getTime());
  });

  it('should reject future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const calc = makeCalculator();
    expect(() => new ExecutionDate(future, calc)).toThrow(DomainException);
    expect(() => new ExecutionDate(future, calc)).toThrow(
      'cannot be in the future',
    );
  });

  it('should reject dates beyond 3 business days lookback', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const calc = makeCalculator({ countBusinessDaysBetween: () => 5 });
    expect(() => new ExecutionDate(past, calc)).toThrow(DomainException);
    expect(() => new ExecutionDate(past, calc)).toThrow(
      'beyond 3 business day',
    );
  });

  it('should accept date at exactly 3 business days lookback', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const calc = makeCalculator({ countBusinessDaysBetween: () => 3 });
    expect(() => new ExecutionDate(past, calc)).not.toThrow();
  });

  it('should skip validation when no calculator provided (reconstitute)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 100);
    expect(() => new ExecutionDate(future)).not.toThrow();
  });

  it('isWithinEditWindow returns true when within 3 business days', () => {
    const today = new Date();
    const calc = makeCalculator({ countBusinessDaysBetween: () => 2 });
    const ed = new ExecutionDate(today, calc);
    expect(ed.isWithinEditWindow(calc)).toBe(true);
  });

  it('isWithinEditWindow returns false when beyond 3 business days', () => {
    // Create without calculator to bypass validation, then check with calculator
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const ed = new ExecutionDate(past);
    const calc = makeCalculator({ countBusinessDaysBetween: () => 4 });
    expect(ed.isWithinEditWindow(calc)).toBe(false);
  });

  it('isWithinEditWindow returns true at exactly 3 business days', () => {
    const today = new Date();
    const calc = makeCalculator({ countBusinessDaysBetween: () => 3 });
    const ed = new ExecutionDate(today, calc);
    expect(ed.isWithinEditWindow(calc)).toBe(true);
  });

  it('daysSinceExecution delegates to calculator', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const ed = new ExecutionDate(past);
    const calc = makeCalculator({ countBusinessDaysBetween: () => 7 });
    expect(ed.daysSinceExecution(calc)).toBe(7);
  });
});
