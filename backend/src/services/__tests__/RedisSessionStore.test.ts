jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn()
}));

import { getRedisClient } from '../../config/redis';
import { RedisSessionStore } from '../RedisSessionStore';

describe('RedisSessionStore', () => {
  const clientMock = {
    set: jest.fn(),
    sAdd: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue(clientMock);
  });

  it('creates session and user index with ttl', async () => {
    const store = new RedisSessionStore();

    const expiresAt = new Date(Date.now() + 120_000).toISOString();

    await store.create({
      userId: 'user-1',
      refreshToken: 'ref-1',
      accessToken: 'acc-1',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt
    });

    expect(clientMock.set).toHaveBeenCalledTimes(1);
    expect(clientMock.sAdd).toHaveBeenCalledWith('session:user:user-1', 'ref-1');
    expect(clientMock.expire).toHaveBeenCalled();
  });

  it('finds session by refresh token', async () => {
    const store = new RedisSessionStore();

    clientMock.get.mockResolvedValue(JSON.stringify({
      userId: 'user-1',
      refreshToken: 'ref-1',
      accessToken: 'acc-1',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    }));

    const session = await store.findByRefreshToken('ref-1');

    expect(session?.userId).toBe('user-1');
  });

  it('rotates refresh token and removes old index', async () => {
    const store = new RedisSessionStore();

    clientMock.get.mockResolvedValueOnce(JSON.stringify({
      userId: 'user-1',
      refreshToken: 'ref-old',
      accessToken: 'acc-old',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    }));

    await store.rotateRefreshToken('ref-old', {
      userId: 'user-1',
      refreshToken: 'ref-new',
      accessToken: 'acc-new',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    expect(clientMock.del).toHaveBeenCalledWith('session:refresh:ref-old');
    expect(clientMock.sRem).toHaveBeenCalledWith('session:user:user-1', 'ref-old');
    expect(clientMock.set).toHaveBeenCalled();
  });

  it('revokes all user sessions', async () => {
    const store = new RedisSessionStore();

    clientMock.sMembers.mockResolvedValue(['ref-1', 'ref-2']);

    clientMock.get
      .mockResolvedValueOnce(JSON.stringify({
        userId: 'user-1',
        refreshToken: 'ref-1',
        accessToken: 'acc-1',
        ipAddress: '127.0.0.1',
        userAgent: 'ua',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        location: 'Unknown',
        isActive: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      }))
      .mockResolvedValueOnce(JSON.stringify({
        userId: 'user-1',
        refreshToken: 'ref-2',
        accessToken: 'acc-2',
        ipAddress: '127.0.0.1',
        userAgent: 'ua',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        location: 'Unknown',
        isActive: true,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      }));

    await store.revokeAllByUser('user-1');

    expect(clientMock.sMembers).toHaveBeenCalledWith('session:user:user-1');
    expect(clientMock.set).toHaveBeenCalledTimes(2);
  });
});
