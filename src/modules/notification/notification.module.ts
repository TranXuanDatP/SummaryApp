import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { UserModule } from '@modules/user/user.module';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { ProjectModule } from '@modules/project/project.module';
import { CommentModule } from '@modules/comment/comment.module';
import { NotificationController } from './infrastructure/http';
import { NotificationRepository } from './infrastructure/persistence/write';
import { NotificationReadDao } from './infrastructure/persistence/read';
import { ConsoleEmailService } from './infrastructure/services';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from './constants/tokens';
import { IEmailService } from './domain/services';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { EventHandlers } from './infrastructure/event-handlers';
import { NotificationReadModelProjection } from './infrastructure/projections';
import { Schedulers } from './infrastructure/schedulers';

@Module({
  imports: [
    SharedCqrsModule,
    UserModule,
    WorkLogModule,
    ProjectModule,
    CommentModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    {
      provide: NOTIFICATION_REPOSITORY_TOKEN,
      useExisting: NotificationRepository,
    },
    NotificationReadDao,
    { provide: NOTIFICATION_READ_DAO_TOKEN, useExisting: NotificationReadDao },
    ConsoleEmailService,
    { provide: EMAIL_SERVICE_TOKEN, useExisting: ConsoleEmailService },
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...Schedulers,
    NotificationReadModelProjection,
  ],
  exports: [NOTIFICATION_REPOSITORY_TOKEN, NOTIFICATION_READ_DAO_TOKEN],
})
export class NotificationModule {}
