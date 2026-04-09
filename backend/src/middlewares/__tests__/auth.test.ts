import { FastifyReply, FastifyRequest } from 'fastify';

const redisClientMock = {
  incr: jest.fn(),
  expire: jest.fn()
};

const validateTokenMock = jest.fn();

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(async () => redisClientMock)
}));

jest.mock('../../services/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    validateToken: validateTokenMock
  }))
}));

import { AuthMiddleware } from '../auth';

describe('AuthMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_RATE_LIMIT_MAX = '2';
    process.env.USER_RATE_LIMIT_WINDOW = '1 minute';
  });

  it('authenticate returns 401 when auth header is missing', async () => {
    const middleware = new AuthMiddleware();

    const reply = {
      status: jest.fn(),
      send: jest.fn()
    } as unknown as FastifyReply;

    (reply.status as unknown as jest.Mock).mockReturnValue(reply);

    const request = {
      headers: {},
      log: { warn: jest.fn(), info: jest.fn() }
    } as unknown as FastifyRequest;

    await middleware.authenticate(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('authenticate attaches user when token is valid', async () => {
    const middleware = new AuthMiddleware();

    validateTokenMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isPremium: false
    });

    const reply = {
      status: jest.fn(),
      send: jest.fn()
    } as unknown as FastifyReply;

    const request = {
      headers: { authorization: 'Bearer token-123' },
      log: { warn: jest.fn(), info: jest.fn() }
    } as unknown as FastifyRequest & { user?: { id: string } };

    await middleware.authenticate(request, reply);

    expect(validateTokenMock).toHaveBeenCalledWith('token-123');
    expect(request.user?.id).toBe('user-1');
  });

  it('requirePremium returns 403 for non-premium user', async () => {
    const middleware = new AuthMiddleware();

    const reply = {
      status: jest.fn(),
      send: jest.fn()
    } as unknown as FastifyReply;

    (reply.status as unknown as jest.Mock).mockReturnValue(reply);

    const request = {
      user: { id: 'user-1', email: 'u@example.com', isPremium: false }
    } as unknown as FastifyRequest;

    await middleware.requirePremium(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('requireOwnership returns 403 when userId differs', async () => {
    const middleware = new AuthMiddleware();

    const reply = {
      status: jest.fn(),
      send: jest.fn()
    } as unknown as FastifyReply;

    (reply.status as unknown as jest.Mock).mockReturnValue(reply);

    const request = {
      user: { id: 'user-1', email: 'u@example.com', isPremium: true },
      params: { userId: 'user-2' }
    } as unknown as FastifyRequest;

    await middleware.requireOwnership(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when user is missing in userRateLimit', async () => {
    const middleware = new AuthMiddleware();

    const reply = {
      status: jest.fn(),
      send: jest.fn(),
      header: jest.fn()
    } as unknown as FastifyReply;

    (reply.status as unknown as jest.Mock).mockReturnValue(reply);

    const request = {
      method: 'GET',
      url: '/api/auth/me',
      log: { warn: jest.fn(), info: jest.fn() }
    } as unknown as FastifyRequest;

    await middleware.userRateLimit(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  });

  it('returns 429 when user exceeds limit', async () => {
    const middleware = new AuthMiddleware();

    redisClientMock.incr.mockResolvedValue(3);
    redisClientMock.expire.mockResolvedValue(1);

    const reply = {
      status: jest.fn(),
      send: jest.fn(),
      header: jest.fn()
    } as unknown as FastifyReply;

    (reply.status as unknown as jest.Mock).mockReturnValue(reply);
    (reply.header as unknown as jest.Mock).mockReturnValue(reply);

    const request = {
      method: 'POST',
      url: '/api/accounts',
      user: { id: 'user-1', email: 'user@example.com', isPremium: false },
      log: { warn: jest.fn(), info: jest.fn() }
    } as unknown as FastifyRequest;

    await middleware.userRateLimit(request, reply);

    expect(redisClientMock.incr).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledWith('Retry-After', '60');
    expect(reply.status).toHaveBeenCalledWith(429);
  });

  it('logs warning and allows request when redis rate-limit fails', async () => {
    const middleware = new AuthMiddleware();

    redisClientMock.incr.mockRejectedValue(new Error('redis unavailable'));

    const warnMock = jest.fn();

    const reply = {
      status: jest.fn(),
      send: jest.fn(),
      header: jest.fn()
    } as unknown as FastifyReply;

    const request = {
      method: 'POST',
      url: '/api/accounts',
      user: { id: 'user-1', email: 'user@example.com', isPremium: false },
      log: { warn: warnMock, info: jest.fn() }
    } as unknown as FastifyRequest;

    await middleware.userRateLimit(request, reply);

    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(reply.status).not.toHaveBeenCalledWith(429);
  });
});
