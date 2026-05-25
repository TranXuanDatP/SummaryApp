import {
  BaseValueObject,
  DomainException,
  DomainErrorCode,
} from 'src/libs/core/domain';

export class ProjectId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException(
        'Project ID cannot be empty',
        DomainErrorCode.PROJECT_ID_EMPTY,
      );
    }

    if (value.length > 50) {
      throw new DomainException(
        'Project ID cannot exceed 50 characters',
        DomainErrorCode.PROJECT_ID_TOO_LONG,
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
