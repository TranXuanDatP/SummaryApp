import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from 'src/libs/core/application';
import { DATABASE_WRITE_TOKEN, EventsHandler, type DrizzleDB } from 'src/libs/shared';
import {
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
} from '../../domain/events';

class NestProjectionLogger implements IProjectionLogger {
  private readonly logger: Logger;
  constructor(context: string) {
    this.logger = new Logger(context);
  }
  log(message: string): void { this.logger.log(message); }
  error(message: string, trace?: string): void { this.logger.error(message, trace); }
  warn(message: string): void { this.logger.warn(message); }
  debug(message: string): void { this.logger.debug(message); }
}

@Injectable()
@EventsHandler(ProjectCreatedEvent, ProjectUpdatedEvent)
export class ProjectReadModelProjection
  extends BaseProjection<ProjectCreatedEvent | ProjectUpdatedEvent>
  implements IEventHandler<ProjectCreatedEvent | ProjectUpdatedEvent>
{
  private processedEvents: Set<string> = new Set();

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {
    super(new NestProjectionLogger('ProjectReadModelProjection'));
  }

  async handle(
    event: ProjectCreatedEvent | ProjectUpdatedEvent,
  ): Promise<void> {
    switch (event.eventType) {
      case 'ProjectCreated':
        this.logger.log(`Project created: ${event.aggregateId} - ${(event as ProjectCreatedEvent).data.name}`);
        break;
      case 'ProjectUpdated':
        this.logger.log(`Project updated: ${event.aggregateId}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  protected async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  protected async markEventProcessed(eventId: string): Promise<void> {
    this.processedEvents.add(eventId);
    if (this.processedEvents.size > 1000) {
      const arr = Array.from(this.processedEvents);
      this.processedEvents = new Set(arr.slice(-500));
    }
  }
}
