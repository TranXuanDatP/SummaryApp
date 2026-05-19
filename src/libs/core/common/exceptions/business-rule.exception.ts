import { BaseException } from './base.exception';

/**
 * Business Rule Exception
 * Thrown when a business rule is violated (e.g., 3-day lock, future date)
 * HTTP Status: 422 (Unprocessable Entity)
 */
export class BusinessRuleException extends BaseException {
  constructor(
    message: string,
    code: string = 'BUSINESS_RULE_VIOLATION',
    details?: Record<string, unknown> | unknown[],
  ) {
    super(message, code, details);
  }

  static violation(
    rule: string,
    details?: Record<string, unknown> | unknown[],
  ): BusinessRuleException {
    return new BusinessRuleException(
      `Business rule violated: ${rule}`,
      'BUSINESS_RULE_VIOLATION',
      Array.isArray(details) ? [{ rule }, ...details] : { rule, ...details },
    );
  }
}
