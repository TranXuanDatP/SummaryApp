import { ConsoleEmailService } from './console-email.service';

describe('ConsoleEmailService', () => {
  let service: ConsoleEmailService;

  beforeEach(() => {
    service = new ConsoleEmailService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call send without throwing', async () => {
    await expect(
      service.send('test@example.com', 'Test Subject', 'Test Body'),
    ).resolves.toBeUndefined();
  });
});
