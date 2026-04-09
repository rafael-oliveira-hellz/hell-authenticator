import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const authServiceMocks = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  validateToken: jest.fn()
};

const authenticateMock = jest.fn(async (request: FastifyRequest, _reply: FastifyReply) => {
  (request as FastifyRequest & { user?: { id: string; email: string; isPremium: boolean } }).user = {
    id: 'user-1',
    email: 'user1@example.com',
    isPremium: true
  };
});

jest.mock('../../services/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => authServiceMocks)
}));

jest.mock('../../middlewares/auth', () => ({
  authMiddleware: {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => authenticateMock(request, reply)
  }
}));

import authRoutes from '../auth';

describe('auth routes contract', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify();
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 409 on duplicate register', async () => {
    authServiceMocks.register.mockRejectedValue(new Error('Email already registered'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'user1@example.com',
        password: '12345678',
        confirmPassword: '12345678',
        name: 'User One',
        acceptTerms: true
      }
    });

    expect(response.statusCode).toBe(409);
  });

  it('returns 401 for invalid login credentials', async () => {
    authServiceMocks.login.mockRejectedValue(new Error('Invalid credentials'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'user1@example.com',
        password: 'wrong-pass'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('forwards refresh token to service and returns 200', async () => {
    authServiceMocks.refreshToken.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'refresh-token' }
    });

    expect(response.statusCode).toBe(200);
    expect(authServiceMocks.refreshToken).toHaveBeenCalledWith('refresh-token');
  });

  it('uses authenticated user in logout-all', async () => {
    authServiceMocks.logoutAll.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout-all'
    });

    expect(response.statusCode).toBe(200);
    expect(authServiceMocks.logoutAll).toHaveBeenCalledWith('user-1');
  });

  it('returns 200 valid false for invalid token validation', async () => {
    authServiceMocks.validateToken.mockRejectedValue(new Error('Invalid token'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/validate',
      payload: { token: 'bad-token' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      valid: false,
      message: 'Invalid token'
    });
  });
});
