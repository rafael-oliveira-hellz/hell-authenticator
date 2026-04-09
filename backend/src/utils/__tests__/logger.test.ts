import { logger } from '../logger';

describe('logger utility', () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it('redacts sensitive keys recursively', () => {
    process.env.LOG_LEVEL = 'debug';

    logger.info('test message', {
      password: 'plain',
      nested: {
        token: 'abc',
        safe: 'ok'
      },
      list: [{ secret: 'x' }, { value: 1 }]
    });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const line = String(stdoutSpy.mock.calls[0][0]);
    const payload = JSON.parse(line) as {
      meta: {
        password: string;
        nested: { token: string; safe: string };
        list: Array<{ secret?: string; value?: number }>;
      };
    };

    expect(payload.meta.password).toBe('[REDACTED]');
    expect(payload.meta.nested.token).toBe('[REDACTED]');
    expect(payload.meta.nested.safe).toBe('ok');
    expect(payload.meta.list[0].secret).toBe('[REDACTED]');
    expect(payload.meta.list[1].value).toBe(1);
  });

  it('does not log debug when LOG_LEVEL is info', () => {
    process.env.LOG_LEVEL = 'info';

    logger.debug('hidden debug');

    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('falls back to info for invalid LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'invalid-level';

    logger.debug('hidden debug');
    logger.info('visible info');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it('writes errors to stderr', () => {
    process.env.LOG_LEVEL = 'debug';

    logger.error('failure', { authorization: 'Bearer x' });

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const line = String(stderrSpy.mock.calls[0][0]);
    expect(line).toContain('[REDACTED]');
  });
});
