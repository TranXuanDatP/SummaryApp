import { Injectable, Logger } from '@nestjs/common';
import { IEmailService } from '../../domain/services';

@Injectable()
export class ConsoleEmailService implements IEmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
  }
}
