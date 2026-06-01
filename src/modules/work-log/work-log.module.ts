import { Module, forwardRef } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { ProjectModule } from '@modules/project/project.module';
import { SprintModule } from '@modules/sprint/sprint.module';
import { UserModule } from '@modules/user/user.module';
import { CommentModule } from '@modules/comment/comment.module';


import { WorkLogController, ReportController } from './infrastructure/http';
import { WorkLogRepository } from './infrastructure/persistence/write';
import { WorkLogReadDao } from './infrastructure/persistence/read';
import {
  BusinessDayCalculatorService,
  ExcelExportService,
} from './infrastructure/services';
import {
  WORK_LOG_REPOSITORY_TOKEN,
  WORK_LOG_READ_DAO_TOKEN,
  BUSINESS_DAY_CALCULATOR_TOKEN,
  EXCEL_EXPORT_SERVICE_TOKEN,
} from './constants/tokens';
import { CommandHandlers } from './application/commands/handlers';
import { QueryHandlers } from './application/queries/handlers';
import { WorkLogReadModelProjection } from './infrastructure/projections';

@Module({
  imports: [SharedCqrsModule, ProjectModule, SprintModule, forwardRef(() => UserModule), forwardRef(() => CommentModule)],
  controllers: [WorkLogController, ReportController],
  providers: [
    // Write Side
    WorkLogRepository,
    { provide: WORK_LOG_REPOSITORY_TOKEN, useExisting: WorkLogRepository },

    // Read Side
    WorkLogReadDao,
    { provide: WORK_LOG_READ_DAO_TOKEN, useExisting: WorkLogReadDao },

    // Domain Services (Infrastructure implementations)
    BusinessDayCalculatorService,
    {
      provide: BUSINESS_DAY_CALCULATOR_TOKEN,
      useExisting: BusinessDayCalculatorService,
    },

    // Excel Export
    ExcelExportService,
    { provide: EXCEL_EXPORT_SERVICE_TOKEN, useExisting: ExcelExportService },

    // Command Handlers
    ...CommandHandlers,

    // Query Handlers
    ...QueryHandlers,

    // Event Handlers (Projections)
    WorkLogReadModelProjection,
  ],
  exports: [
    WORK_LOG_REPOSITORY_TOKEN,
    WORK_LOG_READ_DAO_TOKEN,
    BUSINESS_DAY_CALCULATOR_TOKEN,
  ],
})
export class WorkLogModule {}
