export interface IBusinessDayCalculator {
  isBusinessDay(date: Date): boolean;
  countBusinessDaysBetween(start: Date, end: Date): number;
  addBusinessDays(date: Date, days: number): Date;
  getEditWindowClosesAt(executionDate: Date): Date;
}
