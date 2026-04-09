jest.mock('../../config/environment', () => ({
  env: {
    JWT: {
      secret: '0123456789abcdef0123456789abcdef',
      expiresIn: '60m',
      refreshExpiresIn: '7d',
      algorithm: 'HS512'
    }
  }
}));

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

const loggerWarn = jest.fn();

jest.mock('../../utils/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => loggerWarn(...args)
  }
}));

import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { AppDataSource } from '../../config/database';
import { AuthService } from '../AuthService';
import { SessionStore } from '../SessionStore';

describe('AuthService', () => {
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn()
  };

  const sessionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn()
  };

  const sessionStoreMock: jest.Mocked<SessionStore> = {
    create: jest.fn(),
    findByRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    revokeAllByUser: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService() {
    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(userRepository)
      .mockReturnValueOnce(sessionRepository);

    return new AuthService(sessionStoreMock);
  }

  it('throws on duplicate registration email', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        email: 'dupe@example.com',
        password: '12345678',
        confirmPassword: '12345678',
        name: 'Dupe',
        acceptTerms: true
      })
    ).rejects.toThrow('Email already registered');
  });

  it('rejects short password during register', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'new@example.com',
        password: '123',
        confirmPassword: '123',
        name: 'New',
        acceptTerms: true
      })
    ).rejects.toThrow('Password must be at least 8 characters long');
  });

  it('rejects mismatched passwords during register', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'new@example.com',
        password: '12345678',
        confirmPassword: '87654321',
        name: 'New',
        acceptTerms: true
      })
    ).rejects.toThrow('Passwords do not match');
  });

  it('registers user with lowercase email and hash', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue(null);
    (hash as jest.Mock).mockResolvedValue('hashed');
    userRepository.create.mockImplementation((payload: unknown) => ({
      id: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...(payload as Record<string, unknown>)
    }));

    const result = await service.register({
      email: 'UPPER@EXAMPLE.COM',
      password: '12345678',
      confirmPassword: '12345678',
      name: 'User',
      acceptTerms: true
    });

    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'upper@example.com',
      passwordHash: 'hashed'
    }));
    expect(userRepository.save).toHaveBeenCalled();
    expect(result.email).toBe('upper@example.com');
  });

  it('rejects login when user does not exist', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.login({ email: 'x@y.com', password: 'p' }, '127.0.0.1', 'ua')).rejects.toThrow('Invalid credentials');
  });

  it('rejects login when account is disabled', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue({ isActive: false });

    await expect(service.login({ email: 'x@y.com', password: 'p' }, '127.0.0.1', 'ua')).rejects.toThrow('Account is disabled');
  });

  it('rejects login when account is locked', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue({ isActive: true, isLocked: () => true });

    await expect(service.login({ email: 'x@y.com', password: 'p' }, '127.0.0.1', 'ua')).rejects.toThrow('Account is temporarily locked');
  });

  it('increments login attempts on invalid password', async () => {
    const service = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }, '127.0.0.1', 'ua')
    ).rejects.toThrow('Invalid credentials');

    expect(user.incrementLoginAttempts).toHaveBeenCalledTimes(1);
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });

  it('stores session in redis session store on login', async () => {
    const service = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (sign as jest.Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    sessionRepository.create.mockReturnValue({});
    sessionRepository.save.mockResolvedValue(undefined);

    await service.login({ email: 'user@example.com', password: 'correct' }, '127.0.0.1', 'Mozilla/5.0 (Windows NT) Chrome');

    expect(user.resetLoginAttempts).toHaveBeenCalled();
    expect(sessionStoreMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', deviceType: 'desktop', browser: 'Chrome', os: 'Windows' })
    );
  });

  it('uses numeric expiration when signing tokens', async () => {
    const service = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (sign as jest.Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    sessionRepository.create.mockReturnValue({});
    sessionRepository.save.mockResolvedValue(undefined);

    await service.login({ email: 'user@example.com', password: 'correct' }, '127.0.0.1', 'Mozilla/5.0');

    expect(sign).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1' },
      '0123456789abcdef0123456789abcdef',
      { expiresIn: 3600, algorithm: 'HS512' }
    );
    expect(sign).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1', type: 'refresh' },
      '0123456789abcdef0123456789abcdef',
      { expiresIn: 604800, algorithm: 'HS512' }
    );
  });

  it('refreshes token using redis session store as source of truth', async () => {
    const service = createService();

    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'old-refresh',
      accessToken: 'old-access',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isPremium: false,
      isActive: true
    });

    (sign as jest.Mock)
      .mockReturnValueOnce('new-access')
      .mockReturnValueOnce('new-refresh');

    sessionRepository.findOne.mockResolvedValue({
      refreshToken: 'old-refresh',
      accessToken: 'old-access',
      updateLastUsed: jest.fn()
    });

    const result = await service.refreshToken('old-refresh');

    expect(sessionStoreMock.findByRefreshToken).toHaveBeenCalledWith('old-refresh');
    expect(sessionStoreMock.rotateRefreshToken).toHaveBeenCalledWith(
      'old-refresh',
      expect.objectContaining({ refreshToken: 'new-refresh', accessToken: 'new-access' })
    );
    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
      tokenType: 'Bearer'
    });
  });

  it('rejects refresh token when session is missing', async () => {
    const service = createService();
    sessionStoreMock.findByRefreshToken.mockResolvedValue(null);

    await expect(service.refreshToken('missing')).rejects.toThrow('Invalid refresh token');
  });

  it('rejects refresh token when session is revoked', async () => {
    const service = createService();
    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'rt',
      accessToken: 'at',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      revokedAt: new Date().toISOString()
    });

    await expect(service.refreshToken('rt')).rejects.toThrow('Invalid refresh token');
  });

  it('rejects refresh token when user is disabled', async () => {
    const service = createService();
    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'rt',
      accessToken: 'at',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10000).toISOString()
    });
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.refreshToken('rt')).rejects.toThrow('User account is disabled');
  });

  it('logs warning when audit session sync fails on refresh', async () => {
    const service = createService();

    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'old-refresh',
      accessToken: 'old-access',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    userRepository.findOne.mockResolvedValue({ id: 'user-1', email: 'e', isPremium: false, isActive: true });
    (sign as jest.Mock).mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
    sessionRepository.findOne.mockRejectedValue(new Error('audit fail'));

    await service.refreshToken('old-refresh');

    expect(loggerWarn).toHaveBeenCalledWith('Failed to sync refreshed token in audit store', { error: 'audit fail' });
  });

  it('revokes session on logout and persists to audit repository', async () => {
    const service = createService();

    const session = { revoke: jest.fn() };
    sessionRepository.findOne.mockResolvedValue(session);

    await service.logout('refresh-token');

    expect(sessionStoreMock.revoke).toHaveBeenCalledWith('refresh-token', 'User logout');
    expect(session.revoke).toHaveBeenCalledWith('User logout');
    expect(sessionRepository.save).toHaveBeenCalledWith(session);
  });

  it('logs warning when logout audit persistence fails', async () => {
    const service = createService();
    sessionRepository.findOne.mockRejectedValue(new Error('audit down'));

    await service.logout('refresh-token');

    expect(loggerWarn).toHaveBeenCalledWith('Failed to persist logout in audit session store', { error: 'audit down' });
  });

  it('revokes all sessions and saves audit sessions', async () => {
    const service = createService();
    const s1 = { revoke: jest.fn() };
    const s2 = { revoke: jest.fn() };
    sessionRepository.find.mockResolvedValue([s1, s2]);

    await service.logoutAll('user-1');

    expect(sessionStoreMock.revokeAllByUser).toHaveBeenCalledWith('user-1', 'Logout all sessions');
    expect(s1.revoke).toHaveBeenCalledWith('Logout all sessions');
    expect(s2.revoke).toHaveBeenCalledWith('Logout all sessions');
    expect(sessionRepository.save).toHaveBeenCalledWith([s1, s2]);
  });

  it('logs warning when logoutAll audit persistence fails', async () => {
    const service = createService();
    sessionRepository.find.mockRejectedValue(new Error('audit down'));

    await service.logoutAll('user-1');

    expect(loggerWarn).toHaveBeenCalledWith('Failed to persist logout-all in audit session store', {
      userId: 'user-1',
      error: 'audit down'
    });
  });

  it('logs warning when audit persistence fails during login session creation', async () => {
    const service = createService();

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);
    (sign as jest.Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
    sessionRepository.create.mockReturnValue({});
    sessionRepository.save.mockRejectedValue(new Error('audit save failed'));

    await service.login({ email: 'user@example.com', password: 'correct' }, '127.0.0.1', 'Mozilla/5.0');

    expect(loggerWarn).toHaveBeenCalledWith('Failed to persist session in audit store', {
      userId: 'user-1',
      error: 'audit save failed'
    });
  });

  it('refresh succeeds even when audit session is missing', async () => {
    const service = createService();

    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'old-refresh',
      accessToken: 'old-access',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      location: 'Unknown',
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    userRepository.findOne.mockResolvedValue({ id: 'user-1', email: 'e', isPremium: false, isActive: true });
    (sign as jest.Mock).mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
    sessionRepository.findOne.mockResolvedValue(null);

    const result = await service.refreshToken('old-refresh');

    expect(result.accessToken).toBe('new-access');
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it('rejects refresh token when session is inactive', async () => {
    const service = createService();
    sessionStoreMock.findByRefreshToken.mockResolvedValue({
      userId: 'user-1',
      refreshToken: 'rt',
      accessToken: 'at',
      ipAddress: '127.0.0.1',
      userAgent: 'ua',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
      location: 'Unknown',
      isActive: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10000).toISOString()
    });

    await expect(service.refreshToken('rt')).rejects.toThrow('Invalid refresh token');
  });

  it('detects mobile and tablet device types while creating session', async () => {
    const service = createService();
    const baseUser = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(baseUser);
    userRepository.save.mockResolvedValue(baseUser);
    (compare as jest.Mock).mockResolvedValue(true);
    (sign as jest.Mock)
      .mockReturnValueOnce('access-m-1')
      .mockReturnValueOnce('refresh-m-1')
      .mockReturnValueOnce('access-t-1')
      .mockReturnValueOnce('refresh-t-1');
    sessionRepository.create.mockReturnValue({});
    sessionRepository.save.mockResolvedValue(undefined);

    await service.login({ email: 'user@example.com', password: 'correct' }, '127.0.0.1', 'Mozilla/5.0 iPhone');
    await service.login({ email: 'user@example.com', password: 'correct' }, '127.0.0.1', 'TabletBrowser/1.0');

    expect(sessionStoreMock.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ deviceType: 'mobile' })
    );
    expect(sessionStoreMock.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ deviceType: 'tablet' })
    );
  });

  it('parses expiration seconds/hours and falls back on invalid values', () => {
    const service = createService();
    const parseExpiration = (service as unknown as { parseExpiration: (value: string) => number }).parseExpiration.bind(service);

    expect(parseExpiration('15s')).toBe(15);
    expect(parseExpiration('2h')).toBe(7200);
    expect(parseExpiration('invalid')).toBe(3600);
  });
  it('emits JWT tokens with HS512 header', async () => {
    const service = createService();
    const actualJwt = jest.requireActual('jsonwebtoken') as typeof import('jsonwebtoken');

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      isActive: true,
      isPremium: false,
      isLocked: jest.fn(() => false),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {}
    };

    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    (compare as jest.Mock).mockResolvedValue(true);

    (sign as jest.Mock).mockImplementation((payload, secret, options) =>
      actualJwt.sign(payload as object, secret as string, options as import('jsonwebtoken').SignOptions)
    );

    sessionRepository.create.mockReturnValue({});
    sessionRepository.save.mockResolvedValue(undefined);

    const response = await service.login(
      { email: 'user@example.com', password: 'correct' },
      '127.0.0.1',
      'Mozilla/5.0'
    );

    const accessHeaderB64 = response.tokens.accessToken.split('.')[0];
    const accessHeader = JSON.parse(Buffer.from(accessHeaderB64, 'base64url').toString('utf8')) as { alg: string };

    expect(accessHeader.alg).toBe('HS512');
  });

  it('validates token using HS512 allow-list', async () => {
    const service = createService();

    (verify as jest.Mock).mockReturnValue({ userId: 'user-1' });
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isPremium: false,
      isActive: true
    });

    const user = await service.validateToken('valid-token');

    expect(verify).toHaveBeenCalledWith('valid-token', '0123456789abcdef0123456789abcdef', {
      algorithms: ['HS512']
    });
    expect(user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      isPremium: false
    });
  });

  it('returns invalid token when user no longer exists', async () => {
    const service = createService();
    (verify as jest.Mock).mockReturnValue({ userId: 'missing' });
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.validateToken('bad-token')).rejects.toThrow('Invalid token');
  });

  it('returns invalid token when verify fails', async () => {
    const service = createService();
    (verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.validateToken('bad-token')).rejects.toThrow('Invalid token');
  });
});

