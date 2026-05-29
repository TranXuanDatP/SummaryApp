import { BaseValueObject, DomainException } from 'src/libs/core/domain';

/**
 * User Role Value Object
 * Validates role is one of the allowed values
 */
export class UserRole extends BaseValueObject {
  static readonly EMPLOYEE = 'employee';
  static readonly MANAGER = 'manager';

  private static readonly VALID_ROLES = [
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
  ] as const;

  constructor(public readonly value: string) {
    super();

    if (!UserRole.VALID_ROLES.includes(value as any)) {
      throw new DomainException(
        `Vai trò không hợp lệ: "${value}". Phải là một trong: ${UserRole.VALID_ROLES.join(', ')}`,
      );
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
