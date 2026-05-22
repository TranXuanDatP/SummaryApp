import { UpdateNotificationPreferenceHandler } from './update-notification-preference.handler';
import { UpdateNotificationPreferenceCommand, PreferenceItem } from '../update-notification-preference.command';
import { DomainException, DomainErrorCode } from 'src/libs/core/domain';
import { BusinessRuleException } from 'src/libs/core/common';

describe('UpdateNotificationPreferenceHandler', () => {
  let handler: UpdateNotificationPreferenceHandler;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      savePreference: jest.fn(),
    };
    handler = new UpdateNotificationPreferenceHandler(mockRepository);
  });

  it('should create new preference when none exists (upsert insert)', async () => {
    mockRepository.savePreference.mockResolvedValue(undefined);

    const command = new UpdateNotificationPreferenceCommand('user-1', [
      new PreferenceItem('daily_work_log_reminder', 'email', true),
    ]);

    await handler.execute(command);

    expect(mockRepository.savePreference).toHaveBeenCalledTimes(1);
    const pref = mockRepository.savePreference.mock.calls[0][0];
    expect(pref.userId).toBe('user-1');
    expect(pref.type.value).toBe('daily_work_log_reminder');
    expect(pref.channel.value).toBe('email');
    expect(pref.enabled).toBe(true);
  });

  it('should update existing preference (upsert update)', async () => {
    mockRepository.savePreference.mockResolvedValue(undefined);

    const command = new UpdateNotificationPreferenceCommand('user-1', [
      new PreferenceItem('daily_work_log_reminder', 'email', false),
      new PreferenceItem('comment_received', 'in_app', true),
    ]);

    await handler.execute(command);

    expect(mockRepository.savePreference).toHaveBeenCalledTimes(2);
  });

  it('should throw BusinessRuleException for invalid type', async () => {
    const command = new UpdateNotificationPreferenceCommand('user-1', [
      new PreferenceItem('invalid_type', 'email', true),
    ]);

    await expect(handler.execute(command)).rejects.toThrow(BusinessRuleException);
    expect(mockRepository.savePreference).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleException for invalid channel', async () => {
    const command = new UpdateNotificationPreferenceCommand('user-1', [
      new PreferenceItem('daily_work_log_reminder', 'sms', true),
    ]);

    await expect(handler.execute(command)).rejects.toThrow(BusinessRuleException);
    expect(mockRepository.savePreference).not.toHaveBeenCalled();
  });
});
