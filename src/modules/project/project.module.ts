import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { ProjectController, SprintController } from './infrastructure/http';
import { ProjectRepository, SprintRepository } from './infrastructure/persistence/write';
import { ProjectReadDao, SprintReadDao } from './infrastructure/persistence/read';
import {
  PROJECT_REPOSITORY_TOKEN,
  PROJECT_READ_DAO_TOKEN,
  SPRINT_REPOSITORY_TOKEN,
  SPRINT_READ_DAO_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { ProjectReadModelProjection } from './infrastructure/projections';

@Module({
  imports: [SharedCqrsModule],
  controllers: [ProjectController, SprintController],
  providers: [
    // Write Side
    ProjectRepository,
    { provide: PROJECT_REPOSITORY_TOKEN, useExisting: ProjectRepository },
    SprintRepository,
    { provide: SPRINT_REPOSITORY_TOKEN, useExisting: SprintRepository },

    // Command Handlers
    ...CommandHandlers,

    // Read Side
    ProjectReadDao,
    { provide: PROJECT_READ_DAO_TOKEN, useExisting: ProjectReadDao },
    SprintReadDao,
    { provide: SPRINT_READ_DAO_TOKEN, useExisting: SprintReadDao },

    // Query Handlers
    ...QueryHandlers,

    // Event Handlers (Projections)
    ProjectReadModelProjection,
  ],
  exports: [PROJECT_REPOSITORY_TOKEN, PROJECT_READ_DAO_TOKEN, SPRINT_REPOSITORY_TOKEN, SPRINT_READ_DAO_TOKEN],
})
export class ProjectModule {}
