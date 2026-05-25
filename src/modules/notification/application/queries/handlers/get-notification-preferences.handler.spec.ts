import { GetNotificationPreferencesHandler } from './get-notification-preferences.handler';
import { GetNotificationPreferencesQuery } from '../get-notification-preferences.query';
import { NotificationPreferenceDto } from '../../dtos/notification-preference.dto';

describe('GetNotificationPreferencesHandler', () => {
  let handler: GetNotificationPreferencesHandler;
  let mockReadDao: any;

  beforeEach(() => {
    mockReadDao = {
      findPreferencesByUserId: jest.fn(),
    };
    handler = new GetNotificationPreferencesHandler(mockReadDao);
  });

  it('should return all 16 default preference entries (8 types x 2 channels) when no saved preferences', async () => {
    mockReadDao.findPreferencesByUserId.mockResolvedValue([]);

    const query = new GetNotificationPreferencesQuery('user-1');
    const result = await handler.execute(query);

    expect(result).toHaveLength(16);
  });

  it('should default in_app enabled for all types', async () => {
    mockReadDao.findPreferencesByUserId.mockResolvedValue([]);

    const query = new GetNotificationPreferencesQuery('user-1');
    const result = await handler.execute(query);

    const inAppPrefs = result.filter((p) => p.channel === 'in_app');
    expect(inAppPrefs).toHaveLength(8);
    for (const pref of inAppPrefs) {
      expect(pref.enabled).toBe(true);
    }
  });

  it('should default email enabled for N-1, N-3, N-5, N-7', async () => {
    mockReadDao.findPreferencesByUserId.mockResolvedValue([]);

    const query = new GetNotificationPreferencesQuery('user-1');
    const result = await handler.execute(query);

    const emailEnabledTypes = [
      'daily_work_log_reminder',
      'weekly_summary',
      'monthly_report_ready',
      'comment_received',
    ];
    const emailPrefs = result.filter((p) => p.channel === 'email');

    for (const pref of emailPrefs) {
      if (emailEnabledTypes.includes(pref.type)) {
        expect(pref.enabled).toBe(true);
      } else {
        expect(pref.enabled).toBe(false);
      }
    }
  });

  it('should override defaults with user explicit preferences', async () => {
    const savedPref = new NotificationPreferenceDto({
      id: 'p-1',
      type: 'daily_work_log_reminder',
      channel: 'email',
      enabled: false,
    });
    mockReadDao.findPreferencesByUserId.mockResolvedValue([savedPref]);

    const query = new GetNotificationPreferencesQuery('user-1');
    const result = await handler.execute(query);

    expect(result).toHaveLength(16);
    const overridden = result.find(
      (p) => p.type === 'daily_work_log_reminder' && p.channel === 'email',
    );
    expect(overridden!.enabled).toBe(false);
    expect(overridden!.id).toBe('p-1');
  });
});
