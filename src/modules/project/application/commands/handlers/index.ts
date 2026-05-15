import { CreateProjectHandler } from './create-project.handler';
import { UpdateProjectHandler } from './update-project.handler';
import { MergeProjectsHandler } from './merge-projects.handler';

export const CommandHandlers = [CreateProjectHandler, UpdateProjectHandler, MergeProjectsHandler];
