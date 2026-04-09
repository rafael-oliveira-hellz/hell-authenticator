import { createLogger, format, transports, Logger } from 'winston';

const REDACT_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apikey',
  'x-api-key',
  'encryption_key',
  'jwt_secret',
  'hash',
  'pin'
]);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function getLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();

  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }

  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[getLogLevel()];
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(input)) {
      if (REDACT_KEYS.has(key.toLowerCase())) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redact(entry);
      }
    }

    return output;
  }

  return value;
}

const errorOnly = format((info) => {
  return info.level === 'error' ? info : false;
});

const nonErrorOnly = format((info) => {
  return info.level === 'error' ? false : info;
});

const toJsonLine = format.printf((info) => {
  const payload: Record<string, unknown> = {
    level: info.level,
    message: info.message,
    timestamp: info.timestamp
  };

  if (info.meta !== undefined) {
    payload.meta = redact(info.meta as unknown);
  }

  return JSON.stringify(payload);
});

export const winstonLogger: Logger = createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  transports: [
    new transports.Stream({
      stream: process.stdout,
      format: format.combine(nonErrorOnly(), format.timestamp(), toJsonLine)
    }),
    new transports.Stream({
      stream: process.stderr,
      format: format.combine(errorOnly(), format.timestamp(), toJsonLine)
    })
  ]
});

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      winstonLogger.log({ level: 'debug', message, meta });
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      winstonLogger.log({ level: 'info', message, meta });
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      winstonLogger.log({ level: 'warn', message, meta });
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      winstonLogger.log({ level: 'error', message, meta });
    }
  }
};
