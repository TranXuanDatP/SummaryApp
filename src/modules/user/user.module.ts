import { Module, forwardRef } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { CommandRunnerModule } from 'nest-commander';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { UserController } from './infrastructure/http';
import { UserRepository } from './infrastructure/persistence/write';
import { UserReadDao } from './infrastructure/persistence/read';
import { BcryptHashService } from './infrastructure/services';
import { SeedCommand } from './infrastructure/cli';
import {
  USER_REPOSITORY_TOKEN,
  USER_READ_DAO_TOKEN,
  HASH_SERVICE_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { UserReadModelProjection } from './infrastructure/projections';

@Module({
  imports: [SharedCqrsModule, CommandRunnerModule, forwardRef(() => WorkLogModule)],
  controllers: [UserController],
  providers: [
    // Write Side
    UserRepository,
    { provide: USER_REPOSITORY_TOKEN, useExisting: UserRepository },

    // Hash Service
    BcryptHashService,
    { provide: HASH_SERVICE_TOKEN, useExisting: BcryptHashService },

    // Command Handlers
    ...CommandHandlers,

    // Read Side
    UserReadDao,
    { provide: USER_READ_DAO_TOKEN, useExisting: UserReadDao },

    // Query Handlers
    ...QueryHandlers,

    // Event Handlers (Projections)
    UserReadModelProjection,

    // CLI Commands
    SeedCommand,
  ],
  exports: [USER_REPOSITORY_TOKEN, USER_READ_DAO_TOKEN, HASH_SERVICE_TOKEN],
})
export class UserModule {}
