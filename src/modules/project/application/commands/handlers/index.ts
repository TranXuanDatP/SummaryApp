import { CreateProjectHandler } from './create-project.handler';
import { UpdateProjectHandler } from './update-project.handler';
import { MergeProjectsHandler } from './merge-projects.handler';
import { DeleteProjectHandler } from './delete-project.handler';

export const CommandHandlers = [
  CreateProjectHandler,
  UpdateProjectHandler,
  MergeProjectsHandler,
  DeleteProjectHandler,
];
