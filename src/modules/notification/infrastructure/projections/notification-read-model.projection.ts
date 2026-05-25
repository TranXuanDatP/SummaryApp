import { Injectable, Logger } from '@nestjs/common';
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from 'src/libs/core/application';
import { EventsHandler } from 'src/libs/shared/cqrs';
import { NotificationSentEvent } from '../../domain/events';

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
@EventsHandler(NotificationSentEvent)
export class NotificationReadModelProjection
  extends BaseProjection<NotificationSentEvent>
  implements IEventHandler<NotificationSentEvent>
{
  private processedEvents: Set<string> = new Set();

  constructor() {
    super(new NestProjectionLogger('NotificationReadModelProjection'));
  }

  async handle(event: NotificationSentEvent): Promise<void> {
    this.logger.log(
      `Notification sent: ${event.aggregateId} to user ${event.data.userId}`,
    );
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
