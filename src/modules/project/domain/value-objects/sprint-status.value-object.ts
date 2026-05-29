import {
  BaseValueObject,
  DomainException,
  DomainErrorCode,
} from 'src/libs/core/domain';

export class SprintStatus extends BaseValueObject {
  static readonly PLANNING = 'planning';
  static readonly IN_PROGRESS = 'in_progress';
  static readonly COMPLETED = 'completed';

  private static readonly VALID_STATUSES = [
    SprintStatus.PLANNING,
    SprintStatus.IN_PROGRESS,
    SprintStatus.COMPLETED,
  ] as const;

  constructor(public readonly value: string) {
    super();

    if (!SprintStatus.VALID_STATUSES.includes(value as any)) {
      throw new DomainException(
        `Invalid sprint status: "${value}". Must be one of: ${SprintStatus.VALID_STATUSES.join(', ')}`,
        DomainErrorCode.SPRINT_INVALID_STATUS,
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
