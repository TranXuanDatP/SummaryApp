import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core';
import {
  SharedCqrsModule,
  LoggingModule,
  HealthModule,
  DrizzleDatabaseModule,
  DrizzleUnitOfWork,
  UNIT_OF_WORK_TOKEN,
  OutboxModule,
  schema,
  ContextModule,
  CorrelationIdMiddleware,
  AuditLogModule,
  AuditLogInterceptor,
  AuditLogService,
} from 'src/libs/shared';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectModule } from './modules/project/project.module';
import { WorkLogModule } from './modules/work-log/work-log.module';
import { CommentModule } from './modules/comment/comment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/http/guards';
import { RolesGuard } from './modules/auth/infrastructure/http/guards';

@Global()
@Module({
  imports: [
    // Configuration (loads .env)
    ConfigModule.forRoot({ isGlobal: true }),
    // Cron Scheduling
    ScheduleModule.forRoot(),
    // Structured Logging with Pino
    LoggingModule,
    // Request Context with Correlation ID for distributed tracing
    ContextModule,
    // DDD/CQRS Module - Global module
    SharedCqrsModule,
    // Drizzle Database with application schema
    DrizzleDatabaseModule.forRoot({
      schema,
      unitOfWorkProvider: {
        provide: UNIT_OF_WORK_TOKEN,
        useClass: DrizzleUnitOfWork,
      },
    }),
    // Transactional Outbox Pattern for reliable event publishing
    OutboxModule,
    // Audit Logging — writes business actions to audit_logs table
    AuditLogModule,
    // Health check endpoints
    HealthModule,
    // User Feature Module
    UserModule,
    // Auth Feature Module
    AuthModule,
    // Project Feature Module
    ProjectModule,
    // WorkLog Feature Module
    WorkLogModule,
    // Comment Feature Module
    CommentModule,
    // Notification Feature Module
    NotificationModule,
  ],
  providers: [
    // Global guards — order matters: JwtAuthGuard runs first, then RolesGuard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global audit log interceptor — logs @AuditLog-decorated endpoints
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        auditLogService: AuditLogService,
        reflector: Reflector,
        contextProvider: any,
      ) => new AuditLogInterceptor(auditLogService, reflector, contextProvider),
      inject: [AuditLogService, Reflector, REQUEST_CONTEXT_TOKEN],
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure global middleware
   *
   * CorrelationIdMiddleware:
   * - Extracts/generates correlation ID from request headers
   * - Sets up request context (correlationId, userId, tenantId)
   * - Adds correlation ID to response headers
   * - Enables distributed tracing across services
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
