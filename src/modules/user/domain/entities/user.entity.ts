import {
  AggregateRoot,
  ISoftDeletable,
  DomainException,
  IEventMetadata,
} from 'src/libs/core/domain';
import { UserRole, UserId, UserEmail } from '../value-objects';
import {
  UserCreatedEvent,
  UserDeactivatedEvent,
  UserReactivatedEvent,
} from '../events';

/**
 * User aggregate properties
 */
export interface UserProps {
  email: UserEmail;
  password: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * User Aggregate Root
 *
 * Implements DDD Aggregate pattern with:
 * - Encapsulated state with private properties
 * - Business methods: deactivate, reactivate, changeRole
 * - Domain event emission for key business actions
 * - Soft delete pattern with restore capability
 */
export class User extends AggregateRoot implements ISoftDeletable {
  private _props: UserProps;
  private _deletedAt?: Date | null = null;

  private constructor(
    id: UserId,
    props: UserProps,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._props = props;
    this._deletedAt = deletedAt;
  }

  // --- Soft Delete Implementation ---

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

  // --- Factory Methods ---

  static create(
    id: UserId,
    props: Omit<UserProps, 'isActive'> & { isActive?: boolean },
    metadata?: IEventMetadata,
  ): User {
    User.validateFullName(props.fullName);
    User.validatePassword(props.password);

    const isActive = props.isActive ?? true;

    const user = new User(id, {
      ...props,
      isActive,
    });

    user.addDomainEvent(
      new UserCreatedEvent(
        id.value,
        {
          email: props.email.value,
          fullName: props.fullName,
          role: props.role.value,
          isActive,
        },
        metadata,
      ),
    );

    return user;
  }

  static reconstitute(
    id: string,
    props: UserProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): User {
    return new User(
      new UserId(id),
      props,
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
  }

  // --- Getters ---

  get email(): UserEmail {
    return this._props.email;
  }

  get password(): string {
    return this._props.password;
  }

  get fullName(): string {
    return this._props.fullName;
  }

  get role(): UserRole {
    return this._props.role;
  }

  get isActive(): boolean {
    return this._props.isActive;
  }

  // --- Business Behaviors ---

  deactivate(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (!this._props.isActive) return;

    this._props.isActive = false;

    this.addDomainEvent(
      new UserDeactivatedEvent(
        this.id,
        { deactivatedBy: metadata?.userId },
        metadata,
      ),
    );
  }

  reactivate(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    if (this._props.isActive) return;

    this._props.isActive = true;

    this.addDomainEvent(new UserReactivatedEvent(this.id, {}, metadata));
  }

  changeRole(newRole: UserRole): void {
    this.ensureNotDeleted();
    if (this._props.role.equals(newRole)) return;

    this._props.role = newRole;
    this.markAsModified();
  }

  // --- Internal Validators ---

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException('Không thể chỉnh sửa người dùng đã xóa');
    }
  }

  private static validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length === 0) {
      throw new DomainException('Họ tên người dùng là bắt buộc');
    }
    if (fullName.length > 200) {
      throw new DomainException('Họ tên không được vượt quá 200 ký tự');
    }
  }

  private static validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new DomainException('Mật khẩu là bắt buộc');
    }
  }
}
