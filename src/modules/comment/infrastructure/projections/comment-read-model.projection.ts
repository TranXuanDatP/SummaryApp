import { Injectable, Logger } from '@nestjs/common';
import { BaseProjection, IEventHandler, IProjectionLogger } from 'src/libs/core/application';
import { EventsHandler } from 'src/libs/shared/cqrs';
import { CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent } from '../../domain/events';

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
@EventsHandler(CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent)
export class CommentReadModelProjection
  extends BaseProjection<CommentCreatedEvent | CommentUpdatedEvent | CommentDeletedEvent>
  implements IEventHandler<CommentCreatedEvent | CommentUpdatedEvent | CommentDeletedEvent>
{
  private processedEvents: Set<string> = new Set();

  constructor() {
    super(new NestProjectionLogger('CommentReadModelProjection'));
  }

  async handle(
    event: CommentCreatedEvent | CommentUpdatedEvent | CommentDeletedEvent,
  ): Promise<void> {
    switch (event.eventType) {
      case 'CommentCreated':
        this.logger.log(`Comment created: ${event.aggregateId}`);
        break;
      case 'CommentUpdated':
        this.logger.log(`Comment updated: ${event.aggregateId}`);
        break;
      case 'CommentDeleted':
        this.logger.log(`Comment deleted: ${event.aggregateId}`);
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
