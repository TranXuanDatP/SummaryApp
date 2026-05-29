import { CreateProjectHandler } from './create-project.handler';
import { UpdateProjectHandler } from './update-project.handler';
import { MergeProjectsHandler } from './merge-projects.handler';
import { DeleteProjectHandler } from './delete-project.handler';
import { CreateSprintHandler } from './create-sprint.handler';
import { UpdateSprintHandler } from './update-sprint.handler';
import { DeleteSprintHandler } from './delete-sprint.handler';
import { UpdateSprintStatusHandler } from './update-sprint-status.handler';

export const CommandHandlers = [
  CreateProjectHandler,
  UpdateProjectHandler,
  MergeProjectsHandler,
  DeleteProjectHandler,
  CreateSprintHandler,
  UpdateSprintHandler,
  DeleteSprintHandler,
  UpdateSprintStatusHandler,
];
