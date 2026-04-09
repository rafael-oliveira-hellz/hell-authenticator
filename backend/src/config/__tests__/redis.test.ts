describe('config/redis', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('connects and returns healthy on PONG', async () => {
    const connectMock = jest.fn(async () => undefined);
    const pingMock = jest.fn(async () => 'PONG');

    jest.doMock('redis', () => ({
      createClient: jest.fn(() => ({
        on: jest.fn(),
        isOpen: false,
        connect: connectMock,
        ping: pingMock
      }))
    }));

    jest.doMock('../environment', () => ({
      env: { REDIS: { url: 'redis://localhost:6379' } }
    }));

    const redisConfig = await import('../redis');

    const health = await redisConfig.checkRedisHealth();

    expect(health).toBe('healthy');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(pingMock).toHaveBeenCalledTimes(1);
  });

  it('returns unhealthy when ping throws', async () => {
    jest.doMock('redis', () => ({
      createClient: jest.fn(() => ({
        on: jest.fn(),
        isOpen: true,
        connect: jest.fn(),
        ping: jest.fn(async () => {
          throw new Error('redis down');
        })
      }))
    }));

    jest.doMock('../environment', () => ({
      env: { REDIS: { url: 'redis://localhost:6379' } }
    }));

    const redisConfig = await import('../redis');
    const health = await redisConfig.checkRedisHealth();

    expect(health).toBe('unhealthy');
  });
});
