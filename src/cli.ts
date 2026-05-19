if (process.env.NODE_ENV !== 'production' && !process.env.SKIP_TSCONFIG_PATHS) {
  try {
    require('tsconfig-paths/register');
  } catch (e) {
    // Ignore error if not found or failing in non-dev env
  }
}
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap();
