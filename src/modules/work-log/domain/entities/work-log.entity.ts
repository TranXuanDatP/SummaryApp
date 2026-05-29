import {
  AggregateRoot,
  DomainException,
  DomainErrorCode,
  IEventMetadata,
} from 'src/libs/core/domain';
import { WorkLogId, ExecutionDate } from '../value-objects';
import {
  WorkLogCreatedEvent,
  WorkLogUpdatedEvent,
  WorkLogDeletedEvent,
  WorkLogUnlockedEvent,
} from '../events';
import type { IBusinessDayCalculator } from '../services';

const MAX_CONTENT_LENGTH = 5000;

export type WorkLogStatus = 'in_progress' | 'done';

export type WorkType =
  | 'code'
  | 'bug_fix'
  | 'research'
  | 'meeting'
  | 'review'
  | 'other';

const VALID_WORK_TYPES: readonly string[] = [
  'code',
  'bug_fix',
  'research',
  'meeting',
  'review',
  'other',
];

export interface WorkLogProps {
  projectId: string;
  employeeId: string;
  sprintId: string | null;
  executionDate: Date;
  content: string;
  workType: WorkType | null;
  status: WorkLogStatus;
  isUnlocked: boolean;
  unlockedBy: string | null;
  unlockedAt: Date | null;
  unlockReason: string | null;
}

export class WorkLog extends AggregateRoot {
  private _props: WorkLogProps;
  private _deletedAt?: Date | null = null;

  private constructor(
    id: WorkLogId,
    props: WorkLogProps,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._props = props;
    this._deletedAt = deletedAt;
  }

  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }

  get projectId(): string {
    return this._props.projectId;
  }

  get employeeId(): string {
    return this._props.employeeId;
  }

  get sprintId(): string | null {
    return this._props.sprintId;
  }

  get workType(): WorkType | null {
    return this._props.workType;
  }

  get executionDate(): Date {
    return new Date(this._props.executionDate);
  }

  get content(): string {
    return this._props.content;
  }

  get status(): WorkLogStatus {
    return this._props.status;
  }

  get isUnlocked(): boolean {
    return this._props.isUnlocked;
  }

  get unlockedBy(): string | null {
    return this._props.unlockedBy;
  }

  get unlockedAt(): Date | null {
    return this._props.unlockedAt;
  }

  get unlockReason(): string | null {
    return this._props.unlockReason;
  }

  public restore(): void {
    if (!this.isDeleted) return;
    this._deletedAt = null;
    this.updatedAt = new Date();
  }

  static create(
    id: WorkLogId,
    props: Omit<
      WorkLogProps,
      'status' | 'isUnlocked' | 'unlockedBy' | 'unlockedAt' | 'unlockReason'
    >,
    calculator: IBusinessDayCalculator,
    metadata?: IEventMetadata,
  ): WorkLog {
    WorkLog.validateProjectId(props.projectId);
    WorkLog.validateEmployeeId(props.employeeId);
    if (props.workType) {
      WorkLog.validateWorkType(props.workType);
    }

    const trimmedContent = props.content?.trim();
    if (!trimmedContent) {
      throw new DomainException(
        'WorkLog content is required',
        DomainErrorCode.WORKLOG_CONTENT_REQUIRED,
      );
    }
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      throw new DomainException(
        `WorkLog content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        DomainErrorCode.WORKLOG_CONTENT_TOO_LONG,
      );
    }

    const executionDate = new Date(props.executionDate);
    new ExecutionDate(executionDate, calculator);

    const workLog = new WorkLog(id, {
      ...props,
      executionDate,
      content: trimmedContent,
      status: 'in_progress',
      isUnlocked: false,
      unlockedBy: null,
      unlockedAt: null,
      unlockReason: null,
    });

    workLog.addDomainEvent(
      new WorkLogCreatedEvent(
        id.value,
        {
          projectId: props.projectId,
          employeeId: props.employeeId,
          executionDate: executionDate.toISOString(),
          content: trimmedContent,
        },
        metadata,
      ),
    );

    return workLog;
  }

  static reconstitute(
    id: string,
    props: WorkLogProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): WorkLog {
    return new WorkLog(
      new WorkLogId(id),
      props,
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
  }

  updateContent(
    newContent: string,
    calculator: IBusinessDayCalculator,
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();
    const trimmed = newContent?.trim();
    if (!trimmed) {
      throw new DomainException(
        'WorkLog content is required',
        DomainErrorCode.WORKLOG_CONTENT_REQUIRED,
      );
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw new DomainException(
        `WorkLog content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        DomainErrorCode.WORKLOG_CONTENT_TOO_LONG,
      );
    }

    if (!this.isWithinEditWindow(calculator) && !this._props.isUnlocked) {
      throw new DomainException(
        'WorkLog is locked. Contact your manager to unlock.',
        DomainErrorCode.WORKLOG_LOCKED,
      );
    }

    this._props.content = trimmed;
    this.markAsModified();

    this.addDomainEvent(
      new WorkLogUpdatedEvent(this.id, { content: trimmed }, metadata),
    );
  }

  delete(calculator: IBusinessDayCalculator, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (!this.isWithinEditWindow(calculator) && !this._props.isUnlocked) {
      throw new DomainException(
        'WorkLog is locked. Contact your manager to unlock.',
        DomainErrorCode.WORKLOG_LOCKED,
      );
    }

    this._deletedAt = new Date();
    this.updatedAt = new Date();

    this.addDomainEvent(
      new WorkLogDeletedEvent(
        this.id,
        { deletedAt: this._deletedAt.toISOString() },
        metadata,
      ),
    );
  }

  forceDelete(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    this._deletedAt = new Date();
    this.updatedAt = new Date();

    this.addDomainEvent(
      new WorkLogDeletedEvent(
        this.id,
        { deletedAt: this._deletedAt.toISOString() },
        metadata,
      ),
    );
  }

  unlock(unlockedBy: string, reason: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();

    if (!unlockedBy || unlockedBy.trim().length === 0) {
      throw new DomainException(
        'Unlock performer identity is required',
        DomainErrorCode.WORKLOG_UNLOCK_IDENTITY_REQUIRED,
      );
    }
    if (!reason || reason.trim().length === 0) {
      throw new DomainException(
        'Unlock reason is required',
        DomainErrorCode.WORKLOG_UNLOCK_REASON_REQUIRED,
      );
    }

    if (this._props.isUnlocked) return;

    this._props.isUnlocked = true;
    this._props.unlockedBy = unlockedBy;
    this._props.unlockedAt = new Date();
    this._props.unlockReason = reason.trim();
    this.markAsModified();

    this.addDomainEvent(
      new WorkLogUnlockedEvent(
        this.id,
        {
          unlockedBy,
          unlockedAt: this._props.unlockedAt.toISOString(),
          unlockReason: reason.trim(),
        },
        metadata,
      ),
    );
  }

  lock(): void {
    if (!this._props.isUnlocked) return;
    this._props.isUnlocked = false;
    this._props.unlockedBy = null;
    this._props.unlockedAt = null;
    this._props.unlockReason = null;
    this.markAsModified();
  }

  markDone(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status === 'done') return;
    this._props.status = 'done';
    this.markAsModified();
    this.addDomainEvent(
      new WorkLogUpdatedEvent(this.id, { status: 'done' }, metadata),
    );
  }

  reopen(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status === 'in_progress') return;
    this._props.status = 'in_progress';
    this.markAsModified();
    this.addDomainEvent(
      new WorkLogUpdatedEvent(this.id, { status: 'in_progress' }, metadata),
    );
  }

  isWithinEditWindow(calculator: IBusinessDayCalculator): boolean {
    if (this._props.isUnlocked) return true;
    const executionDate = new ExecutionDate(this._props.executionDate);
    return executionDate.isWithinEditWindow(calculator);
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException(
        'Cannot modify deleted WorkLog',
        DomainErrorCode.WORKLOG_ALREADY_DELETED,
      );
    }
  }

  private static validateProjectId(projectId: string): void {
    if (!projectId || projectId.trim().length === 0) {
      throw new DomainException(
        'Project ID is required',
        DomainErrorCode.WORKLOG_PROJECT_ID_REQUIRED,
      );
    }
    if (projectId.length > 50) {
      throw new DomainException(
        'Project ID cannot exceed 50 characters',
        DomainErrorCode.WORKLOG_PROJECT_ID_TOO_LONG,
      );
    }
  }

  private static validateEmployeeId(employeeId: string): void {
    if (!employeeId || employeeId.trim().length === 0) {
      throw new DomainException(
        'Employee ID is required',
        DomainErrorCode.WORKLOG_EMPLOYEE_ID_REQUIRED,
      );
    }
    if (employeeId.length > 50) {
      throw new DomainException(
        'Employee ID cannot exceed 50 characters',
        DomainErrorCode.WORKLOG_EMPLOYEE_ID_TOO_LONG,
      );
    }
  }

  private static validateWorkType(workType: string): void {
    if (!VALID_WORK_TYPES.includes(workType)) {
      throw new DomainException(
        `Invalid work type: "${workType}". Must be one of: ${VALID_WORK_TYPES.join(', ')}`,
        DomainErrorCode.WORKLOG_INVALID_WORK_TYPE,
      );
    }
  }
}
