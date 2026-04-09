import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { AuthService } from '../services/AuthService';
import { LoginRequest, RegisterRequest } from '../types';

type AuthUser = {
  id: string;
  email: string;
  isPremium: boolean;
};

type AuthenticatedFastifyRequest = FastifyRequest & { user?: AuthUser };
type RefreshBody = { refreshToken: string };
type ValidateTokenBody = { token: string };

const getAuthenticatedUser = (request: FastifyRequest, reply: FastifyReply): AuthUser | null => {
  const user = (request as AuthenticatedFastifyRequest).user;

  if (!user) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return null;
  }

  return user;
};

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  const registerSchema = {
    type: 'object',
    required: ['email', 'password', 'confirmPassword', 'name', 'acceptTerms'],
    properties: {
      email: { type: 'string', format: 'email', minLength: 5, maxLength: 255 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      confirmPassword: { type: 'string', minLength: 8, maxLength: 128 },
      name: { type: 'string', minLength: 2, maxLength: 100 },
      acceptTerms: { type: 'boolean', enum: [true] }
    }
  };

  const loginSchema = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
      biometricToken: { type: 'string' }
    }
  };

  const refreshSchema = {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' }
    }
  };

  fastify.post<{ Body: RegisterRequest }>('/register', {
    schema: {
      body: registerSchema
    }
  }, async (request, reply) => {
    try {
      const user = await authService.register(request.body);
      reply.status(201).send({ user });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          reply.status(409).send({ error: 'Conflict', message: error.message });
        } else {
          reply.status(400).send({ error: 'Bad Request', message: error.message });
        }
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to register user' });
      }
    }
  });

  fastify.post<{ Body: LoginRequest }>('/login', {
    schema: {
      body: loginSchema
    }
  }, async (request, reply) => {
    try {
      const ipAddress = request.ip || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      const result = await authService.login(request.body, ipAddress, String(userAgent));
      reply.status(200).send(result);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Invalid credentials') ||
          error.message.includes('Account is disabled') ||
          error.message.includes('Account is temporarily locked')
        ) {
          reply.status(401).send({ error: 'Unauthorized', message: error.message });
        } else {
          reply.status(400).send({ error: 'Bad Request', message: error.message });
        }
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to authenticate user' });
      }
    }
  });

  fastify.post<{ Body: RefreshBody }>('/refresh', {
    schema: {
      body: refreshSchema
    }
  }, async (request, reply) => {
    try {
      const tokens = await authService.refreshToken(request.body.refreshToken);
      reply.status(200).send(tokens);
    } catch (error) {
      if (error instanceof Error) {
        reply.status(401).send({ error: 'Unauthorized', message: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to refresh token' });
      }
    }
  });

  fastify.post<{ Body: RefreshBody }>('/logout', {
    schema: {
      body: refreshSchema
    }
  }, async (request, reply) => {
    try {
      await authService.logout(request.body.refreshToken);
      reply.status(200).send({ message: 'Logout successful' });
    } catch {
      reply.status(200).send({ message: 'Logout successful' });
    }
  });

  fastify.post('/logout-all', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      await authService.logoutAll(user.id);
      reply.status(200).send({ message: 'All sessions logged out successfully' });
    } catch {
      reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to logout all sessions' });
    }
  });

  fastify.get('/me', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    reply.status(200).send({
      user: {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium
      }
    });
  });

  fastify.post<{ Body: ValidateTokenBody }>('/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = await authService.validateToken(request.body.token);

      reply.status(200).send({
        valid: true,
        user
      });
    } catch {
      reply.status(200).send({
        valid: false,
        message: 'Invalid token'
      });
    }
  });
}
