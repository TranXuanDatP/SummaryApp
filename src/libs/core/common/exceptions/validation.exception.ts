import { BaseException } from './base.exception';

export interface IValidationErrorDetail {
  property: string;
  constraints: Record<string, string>;
}

export class ValidationException extends BaseException {
  constructor(errors: IValidationErrorDetail[] | string) {
    const message = typeof errors === 'string' ? errors : 'Dữ liệu không hợp lệ';
    const details = typeof errors === 'string' ? undefined : errors;

    super(message, 'VALIDATION_ERROR', details);
  }
}
