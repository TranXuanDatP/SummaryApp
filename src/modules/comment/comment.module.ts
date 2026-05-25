import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { UserModule } from '@modules/user/user.module';
import {
  WorkLogCommentController,
  CommentController,
} from './infrastructure/http';
import { CommentRepository } from './infrastructure/persistence/write';
import { CommentReadDao } from './infrastructure/persistence/read';
import {
  COMMENT_REPOSITORY_TOKEN,
  COMMENT_READ_DAO_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { CommentReadModelProjection } from './infrastructure/projections';

@Module({
  imports: [SharedCqrsModule, WorkLogModule, UserModule],
  controllers: [WorkLogCommentController, CommentController],
  providers: [
    CommentRepository,
    { provide: COMMENT_REPOSITORY_TOKEN, useExisting: CommentRepository },
    CommentReadDao,
    { provide: COMMENT_READ_DAO_TOKEN, useExisting: CommentReadDao },
    ...CommandHandlers,
    CommentReadModelProjection,
  ],
  exports: [COMMENT_REPOSITORY_TOKEN, COMMENT_READ_DAO_TOKEN],
})
export class CommentModule {}
