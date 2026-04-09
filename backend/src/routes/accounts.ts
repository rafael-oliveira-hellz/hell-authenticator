import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { AccountService } from '../services/AccountService';
import { CreateAccountRequest, UpdateAccountRequest } from '../types';

type AuthUser = {
  id: string;
  email: string;
  isPremium: boolean;
};

type AuthenticatedFastifyRequest = FastifyRequest & { user?: AuthUser };
type AccountParams = { id: string };
type SearchQuery = { q: string };

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

export default async function accountRoutes(fastify: FastifyInstance) {
  const accountService = new AccountService();

  const createAccountSchema = {
    type: 'object',
    required: ['name', 'secret'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      issuer: { type: 'string', maxLength: 255 },
      secret: { type: 'string', minLength: 16, maxLength: 255, pattern: '^[A-Z2-7]+=*$' },
      algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'], default: 'SHA1' },
      digits: { type: 'number', enum: [6, 8], default: 6 },
      period: { type: 'number', enum: [15, 30, 60], default: 30 },
      icon: { type: 'string', maxLength: 255 },
      color: { type: 'string', pattern: '^#[0-9A-F]{6}$', maxLength: 7 },
      metadata: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          customFields: { type: 'object', additionalProperties: { type: 'string' } }
        }
      }
    }
  };

  const updateAccountSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      issuer: { type: 'string', maxLength: 255 },
      algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
      digits: { type: 'number', enum: [6, 8] },
      period: { type: 'number', enum: [15, 30, 60] },
      icon: { type: 'string', maxLength: 255 },
      color: { type: 'string', pattern: '^#[0-9A-F]{6}$', maxLength: 7 },
      metadata: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          customFields: { type: 'object', additionalProperties: { type: 'string' } }
        }
      }
    }
  };

  fastify.get('/', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const accounts = await accountService.listAccounts(user.id);
      reply.status(200).send({ accounts });
    } catch {
      reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to list accounts' });
    }
  });

  fastify.post<{ Body: CreateAccountRequest }>('/', {
    preHandler: [authMiddleware.authenticate],
    schema: { body: createAccountSchema }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const account = await accountService.createAccount(user.id, request.body);
      reply.status(201).send({ account });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          reply.status(409).send({ error: 'Conflict', message: error.message });
        } else {
          reply.status(400).send({ error: 'Bad Request', message: error.message });
        }
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create account' });
      }
    }
  });

  fastify.get<{ Params: AccountParams }>('/:id', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const account = await accountService.getAccount(user.id, request.params.id);
      reply.status(200).send({ account });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({ error: 'Not Found', message: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to get account' });
      }
    }
  });

  fastify.put<{ Params: AccountParams; Body: UpdateAccountRequest }>('/:id', {
    preHandler: [authMiddleware.authenticate],
    schema: { body: updateAccountSchema }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const account = await accountService.updateAccount(user.id, request.params.id, request.body);
      reply.status(200).send({ account });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          reply.status(404).send({ error: 'Not Found', message: error.message });
        } else if (error.message.includes('already exists')) {
          reply.status(409).send({ error: 'Conflict', message: error.message });
        } else {
          reply.status(400).send({ error: 'Bad Request', message: error.message });
        }
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update account' });
      }
    }
  });

  fastify.delete<{ Params: AccountParams }>('/:id', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      await accountService.deleteAccount(user.id, request.params.id);
      reply.status(200).send({ message: 'Account deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({ error: 'Not Found', message: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete account' });
      }
    }
  });

  fastify.post<{ Params: AccountParams }>('/:id/increment-usage', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      await accountService.incrementUsage(user.id, request.params.id);
      reply.status(200).send({ message: 'Usage count incremented' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({ error: 'Not Found', message: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to increment usage' });
      }
    }
  });

  fastify.get<{ Querystring: SearchQuery }>('/search', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: { q: { type: 'string', minLength: 1 } }
      }
    }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const accounts = await accountService.searchAccounts(user.id, request.query.q);
      reply.status(200).send({ accounts });
    } catch {
      reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to search accounts' });
    }
  });

  fastify.get('/stats', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const stats = await accountService.getAccountStats(user.id);
      reply.status(200).send({ stats });
    } catch {
      reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to get account stats' });
    }
  });

  fastify.get<{ Params: AccountParams }>('/:id/backup-data', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            backupData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                issuer: { type: 'string' },
                algorithm: { type: 'string' },
                digits: { type: 'number' },
                period: { type: 'number' },
                icon: { type: 'string' },
                color: { type: 'string' },
                hasMetadata: { type: 'boolean' }
              },
              required: ['name', 'algorithm', 'digits', 'period', 'hasMetadata']
            }
          },
          required: ['backupData']
        }
      }
    }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) return;

    try {
      const backupData = await accountService.getBackupData(user.id, request.params.id);
      reply.status(200).send({ backupData });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({ error: 'Not Found', message: error.message });
      } else {
        reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to get backup data' });
      }
    }
  });
}
