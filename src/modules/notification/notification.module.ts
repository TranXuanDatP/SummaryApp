import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { UserModule } from '@modules/user/user.module';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { ProjectModule } from '@modules/project/project.module';

@Module({
  imports: [SharedCqrsModule, UserModule, WorkLogModule, ProjectModule],
  providers: [],
  exports: [],
})
export class NotificationModule {}
