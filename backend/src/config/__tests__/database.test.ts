const loggerInfo = jest.fn();
const loggerError = jest.fn();

jest.mock('../../utils/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfo(...args),
    error: (...args: unknown[]) => loggerError(...args)
  }
}));

import {
  AppDataSource,
  closeDatabase,
  generateMigration,
  healthCheck,
  initializeDatabase,
  isDatabaseConnected,
  resetDatabaseStateForTests,
  revertMigrations,
  runMigrations
} from '../database';

describe('database config helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDatabaseStateForTests();
  });

  it('initializes database and logs success', async () => {
    const initializeSpy = jest.spyOn(AppDataSource, 'initialize').mockResolvedValue(AppDataSource);

    await initializeDatabase();

    expect(initializeSpy).toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith(
      'Database connection established',
      expect.objectContaining({ host: expect.any(String), port: expect.any(Number) })
    );
  });

  it('logs and rethrows initialize errors', async () => {
    const initializeSpy = jest.spyOn(AppDataSource, 'initialize').mockRejectedValue(new Error('init failed'));

    await expect(initializeDatabase()).rejects.toThrow('init failed');
    expect(initializeSpy).toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith('Database connection failed', { error: 'init failed' });
  });

  it('skips initialize when datasource is already connected', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    const initializeSpy = jest.spyOn(AppDataSource, 'initialize');

    await initializeDatabase();

    expect(initializeSpy).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith(
      'Database connection already established',
      expect.objectContaining({ host: expect.any(String), port: expect.any(Number) })
    );

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('closes database and logs success', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    const destroySpy = jest.spyOn(AppDataSource, 'destroy').mockResolvedValue(undefined);

    await closeDatabase();

    expect(destroySpy).toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith('Database connection closed');

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('logs and rethrows close errors', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    jest.spyOn(AppDataSource, 'destroy').mockRejectedValue(new Error('close failed'));

    await expect(closeDatabase()).rejects.toThrow('close failed');
    expect(loggerError).toHaveBeenCalledWith('Error closing database connection', { error: 'close failed' });

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('skips close when datasource is already disconnected', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: false });
    const destroySpy = jest.spyOn(AppDataSource, 'destroy');

    await closeDatabase();

    expect(destroySpy).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith('Database connection already closed');

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('reports isDatabaseConnected based on datasource flag', () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    expect(isDatabaseConnected()).toBe(true);
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: false });
    expect(isDatabaseConnected()).toBe(false);

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('runs migrations when pending', async () => {
    jest.spyOn(AppDataSource, 'showMigrations').mockResolvedValue(true);
    const runSpy = jest.spyOn(AppDataSource, 'runMigrations').mockResolvedValue([]);

    await runMigrations();

    expect(runSpy).toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith('Running pending migrations');
    expect(loggerInfo).toHaveBeenCalledWith('Migrations completed');
  });

  it('skips migration run when no pending migration exists', async () => {
    jest.spyOn(AppDataSource, 'showMigrations').mockResolvedValue(false);
    const runSpy = jest.spyOn(AppDataSource, 'runMigrations').mockResolvedValue([]);

    await runMigrations();

    expect(runSpy).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith('No pending migrations');
  });

  it('logs and rethrows migration errors', async () => {
    jest.spyOn(AppDataSource, 'showMigrations').mockRejectedValue(new Error('migration fail'));

    await expect(runMigrations()).rejects.toThrow('migration fail');
    expect(loggerError).toHaveBeenCalledWith('Error running migrations', { error: 'migration fail' });
  });

  it('reverts migrations and logs', async () => {
    const undoSpy = jest.spyOn(AppDataSource, 'undoLastMigration').mockResolvedValue(undefined);

    await revertMigrations();

    expect(undoSpy).toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith('Reverting migrations');
    expect(loggerInfo).toHaveBeenCalledWith('Last migration reverted');
  });

  it('logs and rethrows revert errors', async () => {
    jest.spyOn(AppDataSource, 'undoLastMigration').mockRejectedValue(new Error('revert fail'));

    await expect(revertMigrations()).rejects.toThrow('revert fail');
    expect(loggerError).toHaveBeenCalledWith('Error reverting migrations', { error: 'revert fail' });
  });

  it('generateMigration logs start and finish', async () => {
    await generateMigration('add_users_table');

    expect(loggerInfo).toHaveBeenCalledWith('Generating migration', { name: 'add_users_table' });
    expect(loggerInfo).toHaveBeenCalledWith('Migration generated');
  });

  it('healthCheck returns unhealthy when disconnected', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: false });

    const result = await healthCheck();

    expect(result.status).toBe('unhealthy');

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('healthCheck returns healthy when query succeeds', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    const querySpy = jest.spyOn(AppDataSource, 'query').mockResolvedValue([]);

    const result = await healthCheck();

    expect(querySpy).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('healthy');

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });

  it('healthCheck returns unhealthy when query fails', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(AppDataSource, 'isInitialized');
    Object.defineProperty(AppDataSource, 'isInitialized', { configurable: true, value: true });
    jest.spyOn(AppDataSource, 'query').mockRejectedValue(new Error('query fail'));

    const result = await healthCheck();

    expect(result.status).toBe('unhealthy');

    if (descriptor) {
      Object.defineProperty(AppDataSource, 'isInitialized', descriptor);
    }
  });
});
