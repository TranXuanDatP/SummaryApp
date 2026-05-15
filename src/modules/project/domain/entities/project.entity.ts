import {
  AggregateRoot,
  ISoftDeletable,
  DomainException,
  IEventMetadata,
} from 'src/libs/core/domain';
import { ProjectStatus, ProjectId } from '../value-objects';
import {
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectCompletedEvent,
  ProjectArchivedEvent,
} from '../events';

export interface ProjectProps {
  name: string;
  description: string | null;
  status: ProjectStatus;
}

export class Project extends AggregateRoot implements ISoftDeletable {
  private _props: ProjectProps;
  private _deletedAt?: Date | null = null;

  private constructor(
    id: ProjectId,
    props: ProjectProps,
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
    id: ProjectId,
    props: Omit<ProjectProps, 'status'> & { status?: ProjectStatus },
    metadata?: IEventMetadata,
  ): Project {
    const trimmedName = props.name.trim();
    Project.validateName(trimmedName);
    Project.validateDescription(props.description);

    const status = props.status ?? new ProjectStatus(ProjectStatus.ACTIVE);

    const project = new Project(id, {
      ...props,
      name: trimmedName,
      status,
    });

    project.addDomainEvent(
      new ProjectCreatedEvent(
        id.value,
        {
          name: props.name,
          description: props.description,
          status: status.value,
        },
        metadata,
      ),
    );

    return project;
  }

  static reconstitute(
    id: string,
    props: ProjectProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): Project {
    return new Project(
      new ProjectId(id),
      props,
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
  }

  get name(): string {
    return this._props.name;
  }

  get description(): string | null {
    return this._props.description;
  }

  get status(): ProjectStatus {
    return this._props.status;
  }

  updateDetails(
    params: { name?: string; description?: string | null },
    metadata?: IEventMetadata,
  ): void {
    this.ensureNotDeleted();
    if (params.name !== undefined) {
      const trimmedName = params.name.trim();
      Project.validateName(trimmedName);
      params = { ...params, name: trimmedName };
    }

    const hasChanges =
      (params.name !== undefined && params.name !== this._props.name) ||
      (params.description !== undefined &&
        params.description !== this._props.description);

    if (!hasChanges) return;

    if (params.name !== undefined) {
      this._props.name = params.name;
    }
    if (params.description !== undefined) {
      Project.validateDescription(params.description);
      this._props.description = params.description;
    }
    this.markAsModified();

    this.addDomainEvent(
      new ProjectUpdatedEvent(
        this.id,
        { name: params.name, description: params.description },
        metadata,
      ),
    );
  }

  activate(): void {
    this.ensureNotDeleted();
    if (this._props.status.value === ProjectStatus.ACTIVE) return;

    this._props.status = new ProjectStatus(ProjectStatus.ACTIVE);
    this.markAsModified();
  }

  complete(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status.value === ProjectStatus.COMPLETED) return;
    if (this._props.status.value !== ProjectStatus.ACTIVE) {
      throw new DomainException(
        'Only active projects can be completed',
      );
    }

    const previousStatus = this._props.status.value;
    this._props.status = new ProjectStatus(ProjectStatus.COMPLETED);
    this.markAsModified();

    this.addDomainEvent(
      new ProjectCompletedEvent(
        this.id,
        { previousStatus },
        metadata,
      ),
    );
  }

  archive(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.status.value === ProjectStatus.ARCHIVED) return;
    if (
      this._props.status.value !== ProjectStatus.ACTIVE &&
      this._props.status.value !== ProjectStatus.COMPLETED
    ) {
      throw new DomainException(
        'Only active or completed projects can be archived',
      );
    }

    const previousStatus = this._props.status.value;
    this._props.status = new ProjectStatus(ProjectStatus.ARCHIVED);
    this.markAsModified();

    this.addDomainEvent(
      new ProjectArchivedEvent(
        this.id,
        { previousStatus },
        metadata,
      ),
    );
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException('Cannot modify deleted project');
    }
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException('Project name is required');
    }
    if (name.length > 200) {
      throw new DomainException('Project name cannot exceed 200 characters');
    }
  }

  private static validateDescription(description: string | null): void {
    if (description !== null && description.length > 1000) {
      throw new DomainException(
        'Project description cannot exceed 1000 characters',
      );
    }
  }
}
