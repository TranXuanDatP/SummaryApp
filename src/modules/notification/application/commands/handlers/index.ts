import { MarkNotificationReadHandler } from './mark-notification-read.handler';
import { MarkAllReadHandler } from './mark-all-read.handler';
import { UpdateNotificationPreferenceHandler } from './update-notification-preference.handler';

export const CommandHandlers = [
  MarkNotificationReadHandler,
  MarkAllReadHandler,
  UpdateNotificationPreferenceHandler,
];
