import {
  AggregateRoot,
  ISoftDeletable,
  DomainException,
  DomainErrorCode,
  IEventMetadata,
} from 'src/libs/core/domain';
import { SprintStatus, SprintId } from '../value-objects';
import {
  SprintCreatedEvent,
  SprintUpdatedEvent,
  SprintStatusChangedEvent,
} from '../events';

export interface SprintProps {
  projectId: string;
  name: string;
  description: string | null;
  status: SprintStatus;
  startDate: Date | null;
  endDate: Date | null;
  sortOrder: number;
}

export class Sprint extends AggregateRoot implements ISoftDeletable {
  private _props: SprintProps;
  private _deletedAt?: Date | null = null;

  private constructor(
    id: SprintId,
    props: SprintProps,
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

  get name(): string {
    return this._props.name;
  }

  get description(): string | null {
    return this._props.description;
  }

  get status(): SprintStatus {
    return this._props.status;
  }

  get startDate(): Date | null {
    return this._props.startDate;
  }

  get endDate(): Date | null {
    return this._props.endDate;
  }

  get sortOrder(): number {
    return this._props.sortOrder;
  }

  public delete(): void {
    if (this.isDeleted) return;
    this._deletedAt = new Date();
    this.updatedAt = new Date();
  }

  public restore(): void {
    if (!this.isDeleted) return;
    this._deletedAt = null;
    this.updatedAt = new Date();
  }

  static create(
    id: SprintId,
    props: Omit<SprintProps, 'status'> & { status?: SprintStatus },
    metadata?: IEventMetadata,
  ): Sprint {
    const trimmedName = props.name.trim();
    Sprint.validateName(trimmedName);
    Sprint.validateProjectId(props.projectId);
    if (props.description !== undefined && props.description !== null) {
      Sprint.validateDescription(props.description);
    }

    const status = props.status ?? new SprintStatus(SprintStatus.PLANNING);

    const sprint = new Sprint(id, {
      ...props,
      name: trimmedName,
      status,
    });

    sprint.addDomainEvent(
      new SprintCreatedEvent(
        id.value,
        {
          projectId: props.projectId,
          name: trimmedName,
          description: props.description ?? null,
          status: status.value,
        },
        metadata,
      ),
    );

    return sprint;
  }

  static reconstitute(
    id: string,
    props: SprintProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): Sprint {
    return new Sprint(
      new SprintId(id),
      props,
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
  }

  updateDetails(
    params: {
      name?: string;
      description?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      sortOrder?: number;
    },
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();
    if (params.name !== undefined) {
      const trimmedName = params.name.trim();
      Sprint.validateName(trimmedName);
      params = { ...params, name: trimmedName };
    }

    if (params.description !== undefined && params.description !== null) {
      Sprint.validateDescription(params.description);
    }

    const hasChanges =
      (params.name !== undefined && params.name !== this._props.name) ||
      (params.description !== undefined &&
        params.description !== this._props.description) ||
      (params.startDate !== undefined &&
        params.startDate !== this._props.startDate) ||
      (params.endDate !== undefined && params.endDate !== this._props.endDate) ||
      (params.sortOrder !== undefined &&
        params.sortOrder !== this._props.sortOrder);

    if (!hasChanges) return;

    if (params.name !== undefined) this._props.name = params.name;
    if (params.description !== undefined) {
      if (params.description !== null) Sprint.validateDescription(params.description);
      this._props.description = params.description;
    }
    if (params.startDate !== undefined) this._props.startDate = params.startDate;
    if (params.endDate !== undefined) this._props.endDate = params.endDate;
    if (params.sortOrder !== undefined) this._props.sortOrder = params.sortOrder;
    this.markAsModified();

    this.addDomainEvent(
      new SprintUpdatedEvent(this.id, params as any, metadata),
    );
  }

  start(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status.value === SprintStatus.IN_PROGRESS) return;

    const previousStatus = this._props.status.value;
    this._props.status = new SprintStatus(SprintStatus.IN_PROGRESS);
    this.markAsModified();

    this.addDomainEvent(
      new SprintStatusChangedEvent(
        this.id,
        { previousStatus, newStatus: SprintStatus.IN_PROGRESS },
        metadata,
      ),
    );
  }

  complete(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status.value === SprintStatus.COMPLETED) return;

    const previousStatus = this._props.status.value;
    this._props.status = new SprintStatus(SprintStatus.COMPLETED);
    this.markAsModified();

    this.addDomainEvent(
      new SprintStatusChangedEvent(
        this.id,
        { previousStatus, newStatus: SprintStatus.COMPLETED },
        metadata,
      ),
    );
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException(
        'Cannot modify deleted sprint',
        DomainErrorCode.SPRINT_ALREADY_DELETED,
      );
    }
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException(
        'Sprint name is required',
        DomainErrorCode.SPRINT_NAME_REQUIRED,
      );
    }
    if (name.length > 200) {
      throw new DomainException(
        'Sprint name cannot exceed 200 characters',
        DomainErrorCode.SPRINT_NAME_TOO_LONG,
      );
    }
  }

  private static validateProjectId(projectId: string): void {
    if (!projectId || projectId.trim().length === 0) {
      throw new DomainException(
        'Project ID is required for sprint',
        DomainErrorCode.SPRINT_PROJECT_ID_REQUIRED,
      );
    }
  }

  private static validateDescription(description: string): void {
    if (description.length > 1000) {
      throw new DomainException(
        'Sprint description cannot exceed 1000 characters',
        DomainErrorCode.SPRINT_DESCRIPTION_TOO_LONG,
      );
    }
  }
}
