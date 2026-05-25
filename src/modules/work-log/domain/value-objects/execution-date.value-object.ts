import {
  BaseValueObject,
  DomainException,
  DomainErrorCode,
} from 'src/libs/core/domain';
import type { IBusinessDayCalculator } from '../services';

export class ExecutionDate extends BaseValueObject {
  public readonly value: Date;

  constructor(date: Date, calculator?: IBusinessDayCalculator) {
    super();
    this.value = new Date(date);

    if (calculator) {
      this.validateNotFuture(this.value);
      this.validateWithinLookback(this.value, calculator);
    }
  }

  isWithinEditWindow(calculator: IBusinessDayCalculator): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const businessDaysSince = calculator.countBusinessDaysBetween(
      this.value,
      now,
    );
    return businessDaysSince <= 3;
  }

  daysSinceExecution(calculator: IBusinessDayCalculator): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return calculator.countBusinessDaysBetween(this.value, now);
  }

  private validateNotFuture(date: Date): void {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (date > now) {
      throw new DomainException(
        'Execution date cannot be in the future',
        DomainErrorCode.WORKLOG_FUTURE_DATE,
      );
    }
  }

  private validateWithinLookback(
    date: Date,
    calculator: IBusinessDayCalculator,
  ): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const businessDaysSince = calculator.countBusinessDaysBetween(date, now);
    if (businessDaysSince > 3) {
      throw new DomainException(
        'Execution date is beyond 3 business day lookback window',
        DomainErrorCode.WORKLOG_LOOKBACK_EXCEEDED,
      );
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value.toISOString()];
  }
}
