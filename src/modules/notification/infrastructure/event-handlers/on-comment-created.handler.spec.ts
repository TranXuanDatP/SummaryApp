import { randomUUID } from 'crypto';
import { OnCommentCreatedHandler } from './on-comment-created.handler';
import { CommentCreatedEvent } from '@modules/comment/domain/events';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from '../../constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import { IEmailService } from '../../domain/services';
import { WorkLogDto } from '@modules/work-log/application/dtos';
import { UserDto } from '@modules/user/application/dtos';
import { NotificationPreferenceDto } from '../../application/dtos';

describe('OnCommentCreatedHandler', () => {
  let handler: OnCommentCreatedHandler;
  let notificationRepository: any;
  let workLogReadDao: any;
  let userReadDao: any;
  let notificationReadDao: any;
  let emailService: any;

  const mockManagerId = randomUUID();
  const mockEmployeeId = randomUUID();
  const mockWorkLogId = randomUUID();
  const mockCommentId = randomUUID();

  const mockWorkLog = new WorkLogDto({
    id: mockWorkLogId,
    projectId: randomUUID(),
    employeeId: mockEmployeeId,
    executionDate: '2026-05-19',
    content: 'Did some work',
    isUnlocked: false,
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
      status: 'in_progress',
    version: 1,
    isEditable: true,
    editWindowClosesAt: '2026-05-22T17:00:00.000Z',
    projectName: 'Project Alpha',
    employeeName: 'Nguyen Van A',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockManager = new UserDto({
    id: mockManagerId,
    email: 'manager@test.com',
    fullName: 'Tran Van B',
    role: 'manager',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockEmployee = new UserDto({
    id: mockEmployeeId,
    email: 'employee@test.com',
    fullName: 'Nguyen Van A',
    role: 'employee',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  function createEvent(): CommentCreatedEvent {
    return new CommentCreatedEvent(mockCommentId, {
      workLogId: mockWorkLogId,
      authorId: mockManagerId,
      content: 'Good work on this task!',
    });
  }

  beforeEach(() => {
    notificationRepository = { save: jest.fn().mockResolvedValue(undefined) };
    workLogReadDao = { findById: jest.fn() };
    userReadDao = { findById: jest.fn() };
    notificationReadDao = {
      findPreferenceByUserAndTypeAndChannel: jest.fn().mockResolvedValue(null),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    handler = new OnCommentCreatedHandler(
      notificationRepository,
      workLogReadDao,
      userReadDao,
      notificationReadDao,
      emailService,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('success path — default preferences (both enabled)', () => {
    beforeEach(() => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
    });

    it('should create notification and send email when both preferences are default enabled', async () => {
      await handler.handle(createEvent());

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });

    it('should create notification with correct type, title, content, actionLink', async () => {
      await handler.handle(createEvent());

      const notification = notificationRepository.save.mock.calls[0][0];
      expect(notification.userId).toBe(mockEmployeeId);
      expect(notification.type.value).toBe('comment_received');
      expect(notification.title).toContain('Tran Van B');
      expect(notification.title).toBe(
        'Tran Van B đã nhận xét về công việc của bạn',
      );
      expect(notification.content).toContain('Tran Van B');
      expect(notification.content).toContain('2026-05-19');
      expect(notification.content).toContain('Good work on this task!');
      expect(notification.actionLink).toBe(`/work-logs/${mockWorkLogId}`);
    });

    it('should send email with personal content including managerName and workLogDate', async () => {
      await handler.handle(createEvent());

      expect(emailService.send).toHaveBeenCalledWith(
        'employee@test.com',
        'Tran Van B đã nhận xét về công việc của bạn',
        expect.stringContaining('Tran Van B'),
      );
      const body = emailService.send.mock.calls[0][2];
      expect(body).toContain('2026-05-19');
    });
  });

  describe('preference — email disabled', () => {
    beforeEach(() => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
    });

    it('should create notification but NOT send email when email preference is disabled', async () => {
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (userId: string, type: string, channel: string) => {
          if (channel === 'email')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'comment_received',
                channel: 'email',
                enabled: false,
              }),
            );
          return Promise.resolve(null); // in_app default enabled
        },
      );

      await handler.handle(createEvent());

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('preference — in_app disabled', () => {
    beforeEach(() => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
    });

    it('should NOT create notification when in_app preference is disabled', async () => {
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (userId: string, type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'comment_received',
                channel: 'in_app',
                enabled: false,
              }),
            );
          return Promise.resolve(null);
        },
      );

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should still send email when in_app is disabled but email is default enabled', async () => {
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (userId: string, type: string, channel: string) => {
          if (channel === 'in_app')
            return Promise.resolve(
              new NotificationPreferenceDto({
                id: randomUUID(),
                type: 'comment_received',
                channel: 'in_app',
                enabled: false,
              }),
            );
          return Promise.resolve(null); // email default enabled
        },
      );

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('preference — both disabled', () => {
    beforeEach(() => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });
    });

    it('should NOT create notification and NOT send email when both disabled', async () => {
      notificationReadDao.findPreferenceByUserAndTypeAndChannel.mockImplementation(
        (_userId: string, _type: string, channel: string) => {
          return Promise.resolve(
            new NotificationPreferenceDto({
              id: randomUUID(),
              type: 'comment_received',
              channel,
              enabled: false,
            }),
          );
        },
      );

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('error handling — missing entities', () => {
    it('should log error and return when WorkLog not found', async () => {
      workLogReadDao.findById.mockResolvedValue(null);

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should log error and return when manager not found', async () => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockResolvedValue(null);

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should log error and return when employee not found', async () => {
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        return Promise.resolve(null);
      });

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('inactive users', () => {
    it('should skip notification when manager is inactive', async () => {
      const inactiveManager = new UserDto({
        id: mockManagerId,
        email: 'manager@test.com',
        fullName: 'Tran Van B',
        role: 'manager',
        isActive: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(inactiveManager);
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should skip notification when employee is inactive', async () => {
      const inactiveEmployee = new UserDto({
        id: mockEmployeeId,
        email: 'employee@test.com',
        fullName: 'Nguyen Van A',
        role: 'employee',
        isActive: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(inactiveEmployee);
        return Promise.resolve(null);
      });

      await handler.handle(createEvent());

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('self-notification prevention', () => {
    it('should skip notification when employee comments on own WorkLog (authorId === employeeId)', async () => {
      const selfCommentEvent = new CommentCreatedEvent(mockCommentId, {
        workLogId: mockWorkLogId,
        authorId: mockEmployeeId,
        content: 'Self comment',
      });
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockEmployeeId) return Promise.resolve(mockEmployee);
        return Promise.resolve(null);
      });

      await handler.handle(selfCommentEvent);

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('email validation', () => {
    it('should skip email when employee has no email', async () => {
      const noEmailEmployee = new UserDto({
        id: mockEmployeeId,
        email: '',
        fullName: 'Nguyen Van A',
        role: 'employee',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workLogReadDao.findById.mockResolvedValue(mockWorkLog);
      userReadDao.findById.mockImplementation((id: string) => {
        if (id === mockManagerId) return Promise.resolve(mockManager);
        if (id === mockEmployeeId) return Promise.resolve(noEmailEmployee);
        return Promise.resolve(null);
      });

      await handler.handle(createEvent());

      expect(notificationRepository.save).toHaveBeenCalledTimes(1);
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });
});
