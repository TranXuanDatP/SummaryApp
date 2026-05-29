import { CreateWorkLogHandler } from './create-work-log.handler';
import { UpdateWorkLogHandler } from './update-work-log.handler';
import { DeleteWorkLogHandler } from './delete-work-log.handler';
import { UnlockWorkLogHandler } from './unlock-work-log.handler';
import { UpdateWorkLogStatusHandler } from './update-work-log-status.handler';

export const CommandHandlers = [
  CreateWorkLogHandler,
  UpdateWorkLogHandler,
  DeleteWorkLogHandler,
  UnlockWorkLogHandler,
  UpdateWorkLogStatusHandler,
];
