import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { BackupService } from '../services/BackupService';
import { UserCloudConnectionService } from '../services/UserCloudConnectionService';
import { UserCloudOAuthService } from '../services/UserCloudOAuthService';
import {
  CloudProvider,
  ConnectUserCloudProviderRequest,
  CreateBackupRequest,
  RestoreBackupRequest,
  StartUserCloudOAuthRequest,
  UserCloudProvider,
} from '../types';

type AuthUser = {
  id: string;
  email: string;
  isPremium: boolean;
};

type AuthenticatedFastifyRequest = FastifyRequest & { user?: AuthUser };
type BackupParams = { id: string };
type UploadToCloudBody = { cloudProvider: CloudProvider; cloudPath: string };
type UserCloudProviderParams = { provider: UserCloudProvider };

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

export default async function backupRoutes(fastify: FastifyInstance) {
  const backupService = new BackupService();
  const userCloudConnectionService = new UserCloudConnectionService();
  const userCloudOAuthService = new UserCloudOAuthService();

  const createBackupSchema = {
    type: 'object',
    required: ['description', 'type'],
    properties: {
      description: {
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      type: {
        type: 'string',
        enum: ['local', 'cloud', 'manual']
      },
      cloudProvider: {
        type: 'string',
        enum: ['gcp']
      },
      cloudPath: {
        type: 'string',
        maxLength: 500
      },
      retentionDays: {
        type: 'number',
        minimum: 1,
        maximum: 365,
        default: 30
      }
    }
  };

  const restoreBackupSchema = {
    type: 'object',
    required: ['password'],
    properties: {
      password: {
        type: 'string',
        minLength: 1
      }
    }
  };

  const connectUserCloudProviderSchema = {
    type: 'object',
    required: ['provider', 'accessToken'],
    properties: {
      provider: {
        type: 'string',
        enum: ['google-drive'],
      },
      accessToken: {
        type: 'string',
        minLength: 1,
      },
      refreshToken: {
        type: 'string',
      },
      accountEmail: {
        type: 'string',
      },
      externalAccountId: {
        type: 'string',
      },
      expiresAt: {
        type: 'string',
      },
      scopes: {
        type: 'array',
        items: { type: 'string' },
      },
      metadata: {
        type: 'object',
        additionalProperties: true,
      },
    },
  };

  const startUserCloudOAuthSchema = {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['google-drive'],
      },
      successRedirectUri: {
        type: 'string',
      },
      errorRedirectUri: {
        type: 'string',
      },
    },
  };

  fastify.get('/', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const backups = await backupService.listBackups(user.id);
      reply.status(200).send({ backups });
    } catch {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list backups'
      });
    }
  });

  fastify.get('/providers', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const providers = await backupService.listCloudProviders();
      reply.status(200).send({ providers });
    } catch {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list cloud providers'
      });
    }
  });

  fastify.get('/user-cloud-connections', {
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const connections = await userCloudConnectionService.listConnections(user.id);
      reply.status(200).send({ connections });
    } catch {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list user cloud connections',
      });
    }
  });

  fastify.post<{ Body: ConnectUserCloudProviderRequest }>('/user-cloud-connections/connect', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      body: connectUserCloudProviderSchema,
    },
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const connection = await userCloudConnectionService.connectProvider(user.id, request.body);
      reply.status(200).send({ connection });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to connect user cloud provider',
        });
      }
    }
  });

  fastify.post<{ Body: StartUserCloudOAuthRequest }>('/user-cloud-connections/oauth/start', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      body: startUserCloudOAuthSchema,
    },
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const result = await userCloudOAuthService.startAuthorization(user.id, request.body);
      reply.status(200).send(result);
    } catch (error) {
      reply.status(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Failed to start OAuth authorization',
      });
    }
  });

  fastify.get('/user-cloud-connections/oauth/callback', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    await userCloudOAuthService.handleCallback(query, reply);
  });

  fastify.delete<{ Params: UserCloudProviderParams }>('/user-cloud-connections/:provider', {
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      await userCloudConnectionService.disconnectProvider(user.id, request.params.provider);
      reply.status(200).send({
        message: 'User cloud provider disconnected successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to disconnect user cloud provider',
        });
      }
    }
  });

  fastify.post<{ Body: CreateBackupRequest }>('/', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      body: createBackupSchema
    }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const backup = await backupService.createBackup(user.id, request.body);
      reply.status(201).send({ backup });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create backup'
        });
      }
    }
  });

  fastify.get<{ Params: BackupParams }>('/:id', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const backup = await backupService.getBackup(user.id, request.params.id);
      reply.status(200).send({ backup });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get backup'
        });
      }
    }
  });

  fastify.post<{ Params: BackupParams; Body: RestoreBackupRequest }>('/:id/restore', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      body: restoreBackupSchema
    }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const result = await backupService.restoreBackup(user.id, request.params.id, request.body);
      reply.status(200).send({
        message: 'Backup restored successfully',
        ...result
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          reply.status(404).send({
            error: 'Not Found',
            message: error.message
          });
        } else if (error.message.includes('Invalid password')) {
          reply.status(401).send({
            error: 'Unauthorized',
            message: error.message
          });
        } else {
          reply.status(400).send({
            error: 'Bad Request',
            message: error.message
          });
        }
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to restore backup'
        });
      }
    }
  });

  fastify.delete<{ Params: BackupParams }>('/:id', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      await backupService.deleteBackup(user.id, request.params.id);
      reply.status(200).send({
        message: 'Backup deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete backup'
        });
      }
    }
  });

  fastify.post<{ Params: BackupParams; Body: UploadToCloudBody }>('/:id/upload-to-cloud', {
    preHandler: [authMiddleware.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['cloudProvider', 'cloudPath'],
        properties: {
          cloudProvider: {
            type: 'string',
            enum: ['gcp']
          },
          cloudPath: {
            type: 'string',
            maxLength: 500
          }
        }
      }
    }
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      await backupService.uploadToCloud(
        user.id,
        request.params.id,
        request.body.cloudProvider,
        request.body.cloudPath
      );

      reply.status(200).send({
        message: 'Backup uploaded to cloud successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({
          error: 'Not Found',
          message: error.message
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to upload backup to cloud'
        });
      }
    }
  });

  fastify.get<{ Params: BackupParams }>('/:id/download-from-cloud', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const data = await backupService.downloadFromCloud(user.id, request.params.id);

      reply.status(200).send({
        message: 'Backup downloaded from cloud successfully',
        data
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          reply.status(404).send({
            error: 'Not Found',
            message: error.message
          });
        } else if (error.message.includes('not stored in cloud')) {
          reply.status(400).send({
            error: 'Bad Request',
            message: error.message
          });
        } else {
          reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Failed to download backup from cloud'
          });
        }
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to download backup from cloud'
        });
      }
    }
  });

  fastify.get('/stats', {
    preHandler: [authMiddleware.authenticate]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const stats = await backupService.getBackupStats(user.id);
      reply.status(200).send({ stats });
    } catch {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get backup stats'
      });
    }
  });

  fastify.post('/cleanup-expired', {
    preHandler: [authMiddleware.authenticate, authMiddleware.requirePremium]
  }, async (request, reply) => {
    const user = getAuthenticatedUser(request, reply);
    if (!user) {
      return;
    }

    try {
      const deletedCount = await backupService.cleanupExpiredBackups(user.id);
      reply.status(200).send({
        message: 'Expired backups cleaned up successfully',
        deletedCount
      });
    } catch {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cleanup expired backups'
      });
    }
  });
}
