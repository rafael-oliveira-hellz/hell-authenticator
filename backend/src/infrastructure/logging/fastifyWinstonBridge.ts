import { winstonLogger } from './winstonLogger';

type WinstonLevel = 'debug' | 'info' | 'warn' | 'error';

type PinoLogRecord = {
  level?: unknown;
  msg?: unknown;
  time?: unknown;
  [key: string]: unknown;
};

function mapPinoLevel(level: unknown): WinstonLevel {
  if (typeof level !== 'number') {
    return 'info';
  }

  if (level >= 50) {
    return 'error';
  }

  if (level >= 40) {
    return 'warn';
  }

  if (level >= 30) {
    return 'info';
  }

  return 'debug';
}

function toTimestamp(value: unknown): string {
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

function forwardPinoLine(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  try {
    const parsed = JSON.parse(trimmed) as PinoLogRecord;
    const { level, msg, time, ...meta } = parsed;

    winstonLogger.log({
      level: mapPinoLevel(level),
      message: typeof msg === 'string' ? msg : 'Fastify log',
      timestamp: toTimestamp(time),
      meta
    });
  } catch {
    winstonLogger.log({
      level: 'info',
      message: trimmed,
      timestamp: new Date().toISOString()
    });
  }
}

export function createFastifyWinstonStream(): { write: (chunk: string | Buffer) => boolean } {
  return {
    write: (chunk: string | Buffer): boolean => {
      const raw = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      const lines = raw.split('\n');

      for (const line of lines) {
        forwardPinoLine(line);
      }

      return true;
    }
  };
}

export const fastifyWinstonBridge = {
  mapPinoLevel,
  forwardPinoLine
};
