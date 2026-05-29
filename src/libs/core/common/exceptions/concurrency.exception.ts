import { BaseException } from './base.exception';

export class ConcurrencyException extends BaseException {
  constructor(
    message: string = 'Xung đột đồng thời: Phiên bản không khớp',
    public readonly aggregateId: string,
    public readonly expectedVersion?: number,
    public readonly actualVersion?: number,
  ) {
    super(message, 'CONCURRENCY_ERROR', {
      aggregateId,
      expectedVersion,
      actualVersion,
    });
  }

  static versionMismatch(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
  ): ConcurrencyException {
    return new ConcurrencyException(
      `Xung đột đồng thời cho Aggregate [${aggregateId}]: kỳ vọng phiên bản ${expectedVersion}, thực tế ${actualVersion}`,
      aggregateId,
      expectedVersion,
      actualVersion,
    );
  }
}
