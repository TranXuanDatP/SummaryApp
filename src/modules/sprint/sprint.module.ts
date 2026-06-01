import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { ProjectModule } from '@modules/project/project.module';

import { SprintController } from './infrastructure/http';
import { SprintRepository } from './infrastructure/persistence/write';
import { SprintReadDao } from './infrastructure/persistence/read';
import {
  SPRINT_REPOSITORY_TOKEN,
  SPRINT_READ_DAO_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';

@Module({
  imports: [SharedCqrsModule, ProjectModule],
  controllers: [SprintController],
  providers: [
    // Write Side
    SprintRepository,
    { provide: SPRINT_REPOSITORY_TOKEN, useExisting: SprintRepository },

    // Read Side
    SprintReadDao,
    { provide: SPRINT_READ_DAO_TOKEN, useExisting: SprintReadDao },

    // Command Handlers
    ...CommandHandlers,

    // Query Handlers
    ...QueryHandlers,
  ],
  exports: [SPRINT_REPOSITORY_TOKEN, SPRINT_READ_DAO_TOKEN],
})
export class SprintModule {}
