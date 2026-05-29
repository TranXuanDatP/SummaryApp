import { GetProjectHandler } from './get-project.handler';
import { GetProjectListHandler } from './get-project-list.handler';
import { SearchProjectsHandler } from './search-projects.handler';
import { GetSprintsByProjectHandler } from './get-sprints-by-project.handler';
import { GetSprintByIdHandler } from './get-sprint-by-id.handler';

export const QueryHandlers = [
  GetProjectHandler,
  GetProjectListHandler,
  SearchProjectsHandler,
  GetSprintsByProjectHandler,
  GetSprintByIdHandler,
];
