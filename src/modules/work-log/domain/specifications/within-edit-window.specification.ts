import { BaseSpecification } from 'src/libs/core/domain';
import type { IBusinessDayCalculator } from '../services';
import type { WorkLog } from '../entities';

export class WithinEditWindowSpecification extends BaseSpecification<WorkLog> {
  constructor(private readonly calculator: IBusinessDayCalculator) {
    super();
  }

  isSatisfiedBy(workLog: WorkLog): boolean {
    return workLog.isWithinEditWindow(this.calculator);
  }
}
