import { BaseValueObject, DomainException } from 'src/libs/core/domain';

/**
 * User ID Value Object
 * Ensures user ID is always valid
 */
export class UserId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('ID người dùng không được để trống');
    }

    if (value.length > 50) {
      throw new DomainException('ID người dùng không được vượt quá 50 ký tự');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
