import { BaseValueObject, DomainException, DomainErrorCode } from 'src/libs/core/domain';

export class CommentId extends BaseValueObject {
  constructor(value: string) {
    super();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      throw new DomainException('Comment ID cannot be empty', DomainErrorCode.COMMENT_ID_EMPTY);
    }
    if (trimmed.length > 50) {
      throw new DomainException('Comment ID cannot exceed 50 characters', DomainErrorCode.COMMENT_ID_TOO_LONG);
    }
    this.value = trimmed;
  }
  public readonly value: string;

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
