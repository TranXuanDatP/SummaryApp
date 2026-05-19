import { Injectable } from '@nestjs/common';
import type { IBusinessDayCalculator } from '../../domain/services';

@Injectable()
export class BusinessDayCalculatorService implements IBusinessDayCalculator {
  private readonly holidayTimestamps: Set<number>;

  constructor() {
    const holidays = [
      new Date('2026-01-01'),
      new Date('2026-01-29'),
      new Date('2026-01-30'),
      new Date('2026-01-31'),
      new Date('2026-02-01'),
      new Date('2026-02-02'),
      new Date('2026-04-30'),
      new Date('2026-05-01'),
      new Date('2026-09-02'),
    ];
    this.holidayTimestamps = new Set(
      holidays.map((h) => {
        h.setHours(0, 0, 0, 0);
        return h.getTime();
      }),
    );
  }

  isBusinessDay(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    return !this.holidayTimestamps.has(d.getTime());
  }

  countBusinessDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (current < endDate) {
      current.setDate(current.getDate() + 1);
      if (this.isBusinessDay(current)) count++;
    }
    return count;
  }

  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) added++;
    }
    return result;
  }

  getEditWindowClosesAt(executionDate: Date): Date {
    return this.addBusinessDays(executionDate, 3);
  }
}
