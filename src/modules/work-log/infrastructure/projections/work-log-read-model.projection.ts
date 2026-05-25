import { Injectable, Logger } from '@nestjs/common';
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from 'src/libs/core/application';
import { EventsHandler } from 'src/libs/shared/cqrs';
import {
  WorkLogCreatedEvent,
  WorkLogUpdatedEvent,
  WorkLogDeletedEvent,
} from '../../domain/events';

class NestProjectionLogger implements IProjectionLogger {
  private readonly logger: Logger;
  constructor(context: string) {
    this.logger = new Logger(context);
  }
  log(message: string): void {
    this.logger.log(message);
  }
  error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }
  warn(message: string): void {
    this.logger.warn(message);
  }
  debug(message: string): void {
    this.logger.debug(message);
  }
}

@Injectable()
@EventsHandler(WorkLogCreatedEvent, WorkLogUpdatedEvent, WorkLogDeletedEvent)
export class WorkLogReadModelProjection
  extends BaseProjection<
    WorkLogCreatedEvent | WorkLogUpdatedEvent | WorkLogDeletedEvent
  >
  implements
    IEventHandler<
      WorkLogCreatedEvent | WorkLogUpdatedEvent | WorkLogDeletedEvent
    >
{
  private processedEvents: Set<string> = new Set();

  constructor() {
    super(new NestProjectionLogger('WorkLogReadModelProjection'));
  }

  async handle(
    event: WorkLogCreatedEvent | WorkLogUpdatedEvent | WorkLogDeletedEvent,
  ): Promise<void> {
    switch (event.eventType) {
      case 'WorkLogCreated':
        this.logger.log(`WorkLog created: ${event.aggregateId}`);
        break;
      case 'WorkLogUpdated':
        this.logger.log(`WorkLog updated: ${event.aggregateId}`);
        break;
      case 'WorkLogDeleted':
        this.logger.log(`WorkLog deleted: ${event.aggregateId}`);
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
