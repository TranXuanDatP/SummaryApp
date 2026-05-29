import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

function buildPinoHttp() {
  const logDir = process.env.LOG_DIR || 'logs';
  const enableFile = process.env.ENABLE_FILE_LOGGING === 'true';
  const enablePretty = process.env.ENABLE_PRETTY_LOGGING === 'true';
  const isDev = process.env.NODE_ENV !== 'production';

  // Ensure log directory exists
  if (enableFile && !existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const transports: any[] = [];

  // Console transport — pretty print in dev, JSON in prod
  if (isDev && enablePretty) {
    transports.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });
  }

  // File transports
  if (enableFile) {
    // All logs → daily file
    transports.push({
      target: 'pino-roll',
      options: {
        file: join(logDir, 'app'),
        frequency: 'daily',
        dateFormat: 'YYYY-MM-DD',
        extension: '.log',
        mkdir: true,
      },
    });

    // Error logs only → separate daily file
    transports.push({
      target: 'pino-roll',
      options: {
        file: join(logDir, 'error'),
        frequency: 'daily',
        dateFormat: 'YYYY-MM-DD',
        extension: '.log',
        mkdir: true,
      },
      level: 'error',
    });
  }

  const pinoHttp: any = {
    genReqId: (req: any, _res: any) => {
      const existingId = req.headers?.['x-request-id'];
      if (existingId) return existingId as string;
      return randomUUID();
    },

    customLogLevel: (_req: any, res: any, err: any) => {
      if (res?.statusCode >= 500 || err) return 'error';
      if (res?.statusCode >= 400) return 'warn';
      return 'info';
    },

    customSuccessMessage: (req: any, res: any) => {
      const ms = res?.responseTime ? ` (${res.responseTime}ms)` : '';
      return `${req.method} ${req.url} ${res.statusCode}${ms}`;
    },

    customErrorMessage: (req: any, _res: any, err: any) => {
      return `${req.method} ${req.url} failed: ${err.message}`;
    },

    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.secret',
        'req.body.refreshToken',
        'req.body.oldPassword',
        'req.body.newPassword',
        'req.body.confirmPassword',
      ],
      censor: '[REDACTED]',
    },

    serializers: {
      req: (req: any) => {
        const base: any = {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
        };

        // Include body for mutating methods
        const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (mutating.includes(req.method) && req.body) {
          base.body = req.body;
        }

        return base;
      },
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },

    level: process.env.LOG_LEVEL || 'info',

    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  };

  // Add transports if configured
  if (transports.length > 0) {
    if (transports.length === 1) {
      pinoHttp.transport = transports[0];
    } else {
      pinoHttp.transport = {
        targets: transports.map((t) => ({
          ...t,
          level: t.level || (isDev && enablePretty ? 'debug' : 'info'),
        })),
      };
    }
  } else if (!isDev) {
    // Production with no file logging — JSON to stdout
    pinoHttp.transport = undefined;
  }

  return pinoHttp;
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttp(),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
