import { FastifyReply, FastifyRequest } from 'fastify';
import { getRedisClient } from '../config/redis';
import { AuthService } from '../services/AuthService';

type AuthUser = {
  id: string;
  email: string;
  isPremium: boolean;
};

type AuthenticatedRequest = FastifyRequest & { user?: AuthUser };

const parseWindowInSeconds = (rawWindow?: string): number => {
  if (!rawWindow) {
    return 60;
  }

  const match = rawWindow.trim().match(/^(\d+)\s*(second|minute|hour)s?$/i);
  if (!match) {
    return 60;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === 'second') {
    return value;
  }

  if (unit === 'minute') {
    return value * 60;
  }

  if (unit === 'hour') {
    return value * 3600;
  }

  return 60;
};

export class AuthMiddleware {
  private authService = new AuthService();

  async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authorization header is required'
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token is required'
        });
        return;
      }

      const user = await this.authService.validateToken(token);
      (request as AuthenticatedRequest).user = user;
    } catch {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
  }

  async requirePremium(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    if (!authenticatedRequest.user.isPremium) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Premium subscription required'
      });
      return;
    }
  }

  async requireOwnership(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const params = request.params as { userId?: string };
    const userId = params.userId;

    if (userId && userId !== authenticatedRequest.user.id) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Access denied to this resource'
      });
      return;
    }
  }

  async userRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    try {
      const max = parseInt(process.env.USER_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || '100', 10);
      const windowSeconds = parseWindowInSeconds(process.env.USER_RATE_LIMIT_WINDOW || process.env.RATE_LIMIT_WINDOW);
      const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
      const rateKey = `rate-limit:user:${authenticatedRequest.user.id}:${bucket}`;

      const client = await getRedisClient();
      const currentCount = await client.incr(rateKey);

      if (currentCount === 1) {
        await client.expire(rateKey, windowSeconds + 1);
      }

      if (currentCount > max) {
        reply.header('Retry-After', String(windowSeconds));
        reply.status(429).send({
          error: 'Too Many Requests',
          message: 'User rate limit exceeded'
        });
      }
    } catch {
      request.log.warn(
        {
          userId: authenticatedRequest.user.id,
          url: request.url,
          method: request.method
        },
        'Failed to apply user rate limit, allowing request'
      );
    }
  }

  async logUserAction(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (authenticatedRequest.user) {
      request.log.info(
        {
          userId: authenticatedRequest.user.id,
          method: request.method,
          url: request.url
        },
        'User action'
      );
    }
  }
}

export const authMiddleware = new AuthMiddleware();
