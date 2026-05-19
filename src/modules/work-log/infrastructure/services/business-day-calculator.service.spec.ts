import { BusinessDayCalculatorService } from './business-day-calculator.service';

describe('BusinessDayCalculatorService', () => {
  let service: BusinessDayCalculatorService;

  beforeEach(() => {
    service = new BusinessDayCalculatorService();
  });

  describe('isBusinessDay', () => {
    it('should return false for Saturday', () => {
      expect(service.isBusinessDay(new Date('2026-05-16'))).toBe(false); // Saturday
    });

    it('should return false for Sunday', () => {
      expect(service.isBusinessDay(new Date('2026-05-17'))).toBe(false); // Sunday
    });

    it('should return true for a regular weekday', () => {
      expect(service.isBusinessDay(new Date('2026-05-18'))).toBe(true); // Monday
    });

    it('should return false for Vietnamese holiday (Labor Day)', () => {
      expect(service.isBusinessDay(new Date('2026-05-01'))).toBe(false);
    });

    it('should return false for Tet holiday', () => {
      expect(service.isBusinessDay(new Date('2026-01-29'))).toBe(false);
    });

    it('should return false for National Day', () => {
      expect(service.isBusinessDay(new Date('2026-09-02'))).toBe(false);
    });
  });

  describe('countBusinessDaysBetween', () => {
    it('should count 1 business day for consecutive weekdays', () => {
      // Mon May 18 → Tue May 19
      expect(service.countBusinessDaysBetween(new Date('2026-05-18'), new Date('2026-05-19'))).toBe(1);
    });

    it('should skip weekends', () => {
      // Fri May 15 → Mon May 18 = 1 biz day (Sat+Sun skipped, Monday is end)
      expect(service.countBusinessDaysBetween(new Date('2026-05-15'), new Date('2026-05-18'))).toBe(1);
    });

    it('should return 0 for same date', () => {
      expect(service.countBusinessDaysBetween(new Date('2026-05-18'), new Date('2026-05-18'))).toBe(0);
    });

    it('should count 3 business days across a week', () => {
      // Mon May 18 → Thu May 21 = 3 biz days
      expect(service.countBusinessDaysBetween(new Date('2026-05-18'), new Date('2026-05-21'))).toBe(3);
    });
  });

  describe('addBusinessDays', () => {
    it('should add 1 business day to Monday = Tuesday', () => {
      const result = service.addBusinessDays(new Date('2026-05-18'), 1);
      expect(result.getDay()).toBe(2); // Tuesday
    });

    it('should skip weekend when adding 1 day to Friday', () => {
      const result = service.addBusinessDays(new Date('2026-05-15'), 1);
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should add 3 business days correctly', () => {
      // Mon May 18 + 3 biz days = Thu May 21
      const result = service.addBusinessDays(new Date('2026-05-18'), 3);
      expect(result.getDate()).toBe(21);
    });
  });

  describe('getEditWindowClosesAt', () => {
    it('should return date 3 business days after execution date', () => {
      // Mon May 18 → Thu May 21 (3 biz days)
      const result = service.getEditWindowClosesAt(new Date('2026-05-18'));
      expect(result.getDate()).toBe(21);
    });

    it('should skip weekend for Friday execution date', () => {
      // Fri May 15 + 3 biz days = Wed May 20
      const result = service.getEditWindowClosesAt(new Date('2026-05-15'));
      expect(result.getDate()).toBe(20);
    });
  });
});
