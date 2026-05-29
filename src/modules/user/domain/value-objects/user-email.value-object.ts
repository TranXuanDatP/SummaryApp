import { BaseValueObject, DomainException } from 'src/libs/core/domain';

/**
 * User Email Value Object
 * Ensures email format is valid
 */
export class UserEmail extends BaseValueObject {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Email người dùng không được để trống');
    }

    if (!UserEmail.EMAIL_REGEX.test(value)) {
      throw new DomainException('Định dạng email không hợp lệ');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }
}
