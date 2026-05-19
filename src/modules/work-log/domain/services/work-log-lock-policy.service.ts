import type { IBusinessDayCalculator } from './business-day-calculator.interface';
import type { WorkLog } from '../entities';

export class WorkLogLockPolicy {
  isEditable(workLog: WorkLog, calculator: IBusinessDayCalculator): boolean {
    if (workLog.isUnlocked) return true;
    return workLog.isWithinEditWindow(calculator);
  }
}
