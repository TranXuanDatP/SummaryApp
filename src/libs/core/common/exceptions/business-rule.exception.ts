import { BaseException } from './base.exception';

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
      `Vi phạm quy tắc nghiệp vụ: ${rule}`,
      'BUSINESS_RULE_VIOLATION',
      Array.isArray(details) ? [{ rule }, ...details] : { rule, ...details },
    );
  }
}
