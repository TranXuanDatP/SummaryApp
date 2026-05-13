import { User, UserProps } from './user.entity';
import { UserId, UserRole, UserEmail } from '../value-objects';
import { DomainException } from 'src/libs/core/domain';

describe('User Entity', () => {
  const validProps: UserProps = {
    email: new UserEmail('john@example.com'),
    password: 'hashed_password',
    fullName: 'John Doe',
    role: new UserRole('employee'),
    isActive: true,
  };

  // --- Factory: create() ---

  describe('create()', () => {
    it('should create a valid user', () => {
      const id = new UserId('user-1');
      const user = User.create(id, { ...validProps });

      expect(user.id).toBe('user-1');
      expect(user.email.value).toBe('john@example.com');
      expect(user.password).toBe('hashed_password');
      expect(user.fullName).toBe('John Doe');
      expect(user.role.value).toBe('employee');
      expect(user.isActive).toBe(true);
      expect(user.isDeleted).toBe(false);
    });

    it('should emit UserCreatedEvent with isActive', () => {
      const id = new UserId('user-1');
      const user = User.create(id, { ...validProps });

      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserCreated');
      expect(events[0].data).toEqual({
        email: 'john@example.com',
        fullName: 'John Doe',
        role: 'employee',
        isActive: true,
      });
    });

    it('should accept metadata and pass to event', () => {
      const id = new UserId('user-1');
      const metadata = { userId: 'admin', correlationId: 'corr-1' };
      const user = User.create(id, { ...validProps }, metadata);

      const events = user.getDomainEvents();
      expect(events[0].metadata).toEqual(metadata);
    });

    it('should throw DomainException for empty fullName', () => {
      const id = new UserId('user-1');
      expect(() =>
        User.create(id, { ...validProps, fullName: '' }),
      ).toThrow(DomainException);
    });

    it('should throw DomainException for fullName exceeding 200 chars', () => {
      const id = new UserId('user-1');
      expect(() =>
        User.create(id, { ...validProps, fullName: 'a'.repeat(201) }),
      ).toThrow(DomainException);
    });

    it('should throw DomainException for empty password', () => {
      const id = new UserId('user-1');
      expect(() =>
        User.create(id, { ...validProps, password: '' }),
      ).toThrow(DomainException);
    });

    it('should throw DomainException for invalid email', () => {
      const id = new UserId('user-1');
      expect(() =>
        User.create(id, {
          ...validProps,
          email: new (require('../value-objects').UserEmail)('not-an-email'),
        }),
      ).toThrow(DomainException);
    });

    it('should default isActive to true', () => {
      const id = new UserId('user-1');
      const props = { ...validProps, isActive: undefined as any };
      const user = User.create(id, props);

      expect(user.isActive).toBe(true);
    });
  });

  // --- Factory: reconstitute() ---

  describe('reconstitute()', () => {
    it('should reconstitute user without emitting events', () => {
      const user = User.reconstitute(
        'user-1',
        { ...validProps },
        0,
        new Date(),
        new Date(),
      );

      expect(user.id).toBe('user-1');
      expect(user.email.value).toBe('john@example.com');
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should reconstitute with deletedAt', () => {
      const deletedAt = new Date();
      const user = User.reconstitute(
        'user-1',
        { ...validProps },
        0,
        new Date(),
        new Date(),
        deletedAt,
      );

      expect(user.isDeleted).toBe(true);
      expect(user.deletedAt).toEqual(deletedAt);
    });
  });

  // --- deactivate() ---

  describe('deactivate()', () => {
    it('should set isActive to false and emit UserDeactivatedEvent', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.clearDomainEvents();

      user.deactivate();

      expect(user.isActive).toBe(false);
      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserDeactivated');
    });

    it('should populate deactivatedBy from metadata', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.clearDomainEvents();

      const metadata = { userId: 'admin-1' };
      user.deactivate(metadata);

      const events = user.getDomainEvents();
      expect((events[0].data as any).deactivatedBy).toBe('admin-1');
    });

    it('should accept metadata', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.clearDomainEvents();

      const metadata = { userId: 'admin-1' };
      user.deactivate(metadata);

      const events = user.getDomainEvents();
      expect(events[0].metadata).toEqual(metadata);
    });

    it('should not throw if already deactivated', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.deactivate();
      user.clearDomainEvents();

      expect(() => user.deactivate()).not.toThrow();
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('should increment version by exactly 1', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.clearDomainEvents();
      const versionBefore = user.version;

      user.deactivate();

      expect(user.version).toBe(versionBefore + 1);
    });
  });

  // --- reactivate() ---

  describe('reactivate()', () => {
    it('should set isActive to true and emit UserReactivatedEvent', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.deactivate();
      user.clearDomainEvents();

      user.reactivate();

      expect(user.isActive).toBe(true);
      const events = user.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserReactivated');
    });

    it('should not throw if already active', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      expect(() => user.reactivate()).not.toThrow();
      expect(user.isActive).toBe(true);
    });
  });

  // --- changeRole() ---

  describe('changeRole()', () => {
    it('should update role', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });

      user.changeRole(new UserRole('manager'));

      expect(user.role.value).toBe('manager');
    });

    it('should not increment version for same role', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.clearDomainEvents();
      const versionBefore = user.version;

      user.changeRole(new UserRole('employee'));

      expect(user.version).toBe(versionBefore);
    });

    it('should throw DomainException for deleted user', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.delete();

      expect(() => user.changeRole(new UserRole('manager'))).toThrow(
        DomainException,
      );
    });
  });

  // --- delete() / restore() (ISoftDeletable) ---

  describe('delete()', () => {
    it('should soft delete the user', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });

      user.delete();

      expect(user.isDeleted).toBe(true);
      expect(user.deletedAt).toBeInstanceOf(Date);
    });

    it('should not throw if already deleted', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.delete();

      expect(() => user.delete()).not.toThrow();
    });
  });

  describe('restore()', () => {
    it('should restore a soft-deleted user', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.delete();

      user.restore();

      expect(user.isDeleted).toBe(false);
      expect(user.deletedAt).toBeNull();
    });

    it('should not throw if not deleted', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });

      expect(() => user.restore()).not.toThrow();
    });
  });

  // --- ensureNotDeleted guard ---

  describe('mutation guards', () => {
    it('should block deactivate on deleted user', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.delete();

      expect(() => user.deactivate()).toThrow(DomainException);
    });

    it('should block reactivate on deleted user', () => {
      const user = User.create(new UserId('user-1'), { ...validProps });
      user.delete();

      expect(() => user.reactivate()).toThrow(DomainException);
    });
  });
});
