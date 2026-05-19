import { BaseValueObject, DomainException, DomainErrorCode } from 'src/libs/core/domain';

export class ProjectStatus extends BaseValueObject {
  static readonly ACTIVE = 'active';
  static readonly COMPLETED = 'completed';
  static readonly ARCHIVED = 'archived';

  private static readonly VALID_STATUSES = [
    ProjectStatus.ACTIVE,
    ProjectStatus.COMPLETED,
    ProjectStatus.ARCHIVED,
  ] as const;

  constructor(public readonly value: string) {
    super();

    if (!ProjectStatus.VALID_STATUSES.includes(value as any)) {
      throw new DomainException(
        `Invalid project status: "${value}". Must be one of: ${ProjectStatus.VALID_STATUSES.join(', ')}`,
        DomainErrorCode.PROJECT_INVALID_STATUS,
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
