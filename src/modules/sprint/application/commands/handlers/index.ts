import { CreateSprintHandler } from './create-sprint.handler';
import { UpdateSprintHandler } from './update-sprint.handler';
import { DeleteSprintHandler } from './delete-sprint.handler';
import { UpdateSprintStatusHandler } from './update-sprint-status.handler';

export const CommandHandlers = [
  CreateSprintHandler,
  UpdateSprintHandler,
  DeleteSprintHandler,
  UpdateSprintStatusHandler,
];
