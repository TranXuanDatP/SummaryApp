import { DomainException } from 'src/libs/core/domain';
import { Project } from './project.entity';
import { ProjectId } from '../value-objects/project-id.value-object';
import { ProjectStatus } from '../value-objects/project-status.value-object';
import {
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectCompletedEvent,
  ProjectArchivedEvent,
} from '../events';

describe('Project Entity', () => {
  const validId = new ProjectId('proj-001');

  describe('create()', () => {
    it('should create a project with default active status', () => {
      const project = Project.create(validId, {
        name: 'Test Project',
        description: 'A test project',
      });

      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('A test project');
      expect(project.status.value).toBe('active');
      expect(project.version).toBe(1); // addDomainEvent calls markAsUpdated which increments version
      expect(project.isDeleted).toBe(false);
    });

    it('should create with explicit status', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
        status: new ProjectStatus(ProjectStatus.COMPLETED),
      });

      expect(project.status.value).toBe('completed');
    });

    it('should emit ProjectCreatedEvent', () => {
      const project = Project.create(validId, {
        name: 'Test Project',
        description: 'Desc',
      });

      const events = project.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProjectCreated');
    });

    it('should allow null description', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      expect(project.description).toBeNull();
    });

    it('should throw on empty name', () => {
      expect(() =>
        Project.create(validId, { name: '', description: null }),
      ).toThrow(DomainException);
      expect(() =>
        Project.create(validId, { name: '', description: null }),
      ).toThrow('Project name is required');
    });

    it('should throw on whitespace-only name', () => {
      expect(() =>
        Project.create(validId, { name: '   ', description: null }),
      ).toThrow(DomainException);
    });

    it('should throw on name exceeding 200 characters', () => {
      expect(() =>
        Project.create(validId, { name: 'a'.repeat(201), description: null }),
      ).toThrow(DomainException);
    });

    it('should accept name with exactly 200 characters', () => {
      const project = Project.create(validId, {
        name: 'a'.repeat(200),
        description: null,
      });
      expect(project.name).toHaveLength(200);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstruct without emitting events', () => {
      const project = Project.reconstitute(
        'proj-001',
        {
          name: 'Existing',
          description: 'Desc',
          status: new ProjectStatus(ProjectStatus.ACTIVE),
        },
        1,
        new Date(),
        new Date(),
      );

      expect(project.name).toBe('Existing');
      expect(project.version).toBe(1);
      expect(project.getDomainEvents()).toHaveLength(0);
    });

    it('should reconstruct with deletedAt', () => {
      const deletedAt = new Date();
      const project = Project.reconstitute(
        'proj-001',
        {
          name: 'Deleted',
          description: null,
          status: new ProjectStatus(ProjectStatus.ACTIVE),
        },
        1,
        new Date(),
        new Date(),
        deletedAt,
      );

      expect(project.isDeleted).toBe(true);
      expect(project.deletedAt).toEqual(deletedAt);
    });
  });

  describe('updateDetails()', () => {
    it('should update name and emit event', () => {
      const project = Project.create(validId, {
        name: 'Old',
        description: null,
      });
      project.clearDomainEvents();

      project.updateDetails({ name: 'New' });

      expect(project.name).toBe('New');
      const events = project.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProjectUpdated');
    });

    it('should update description', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.clearDomainEvents();

      project.updateDetails({ description: 'New desc' });
      expect(project.description).toBe('New desc');
    });

    it('should not emit event when nothing changed', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: 'Desc',
      });
      project.clearDomainEvents();

      project.updateDetails({ name: 'Test', description: 'Desc' });
      expect(project.getDomainEvents()).toHaveLength(0);
    });

    it('should throw on deleted project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();

      expect(() => project.updateDetails({ name: 'New' })).toThrow(
        DomainException,
      );
    });
  });

  describe('complete()', () => {
    it('should transition active to completed', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.clearDomainEvents();

      project.complete();

      expect(project.status.value).toBe('completed');
      const events = project.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProjectCompleted');
    });

    it('should be idempotent when already completed', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.complete();
      project.clearDomainEvents();

      project.complete();
      expect(project.getDomainEvents()).toHaveLength(0);
    });

    it('should throw when trying to complete an archived project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.complete();
      project.archive();
      project.clearDomainEvents();

      expect(() => project.complete()).toThrow(DomainException);
    });

    it('should throw on deleted project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();

      expect(() => project.complete()).toThrow(DomainException);
    });
  });

  describe('archive()', () => {
    it('should transition active to archived', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.clearDomainEvents();

      project.archive();

      expect(project.status.value).toBe('archived');
      const events = project.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProjectArchived');
    });

    it('should transition completed to archived', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.complete();
      project.clearDomainEvents();

      project.archive();

      expect(project.status.value).toBe('archived');
      expect(project.getDomainEvents()).toHaveLength(1);
    });

    it('should be idempotent when already archived', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.archive();
      project.clearDomainEvents();

      project.archive();
      expect(project.getDomainEvents()).toHaveLength(0);
    });

    it('should throw on deleted project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();

      expect(() => project.archive()).toThrow(DomainException);
    });
  });

  describe('activate()', () => {
    it('should transition completed back to active', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.complete();

      project.activate();
      expect(project.status.value).toBe('active');
    });

    it('should be idempotent when already active', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });

      project.activate();
      expect(project.status.value).toBe('active');
    });

    it('should throw on deleted project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();

      expect(() => project.activate()).toThrow(DomainException);
    });
  });

  describe('soft delete', () => {
    it('should mark project as deleted', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });

      project.delete();

      expect(project.isDeleted).toBe(true);
      expect(project.deletedAt).toBeInstanceOf(Date);
    });

    it('should be idempotent', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();
      const deletedAt = project.deletedAt;

      project.delete();

      expect(project.deletedAt).toEqual(deletedAt);
    });

    it('should restore deleted project', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();
      project.restore();

      expect(project.isDeleted).toBe(false);
      expect(project.deletedAt).toBeNull();
    });

    it('should prevent mutation when deleted', () => {
      const project = Project.create(validId, {
        name: 'Test',
        description: null,
      });
      project.delete();

      expect(() => project.updateDetails({ name: 'New' })).toThrow(
        DomainException,
      );
      expect(() => project.complete()).toThrow(DomainException);
      expect(() => project.archive()).toThrow(DomainException);
    });
  });
});
