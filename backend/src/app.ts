import Fastify from 'fastify';
import 'reflect-metadata';
import { initializeDatabase, runMigrations } from './config/database';
import { env, logConfig, validateConfig } from './config/environment';

import cors from './plugins/cors';
import helmet from './plugins/helmet';
import prometheus from './plugins/prometheus';
import rateLimit from './plugins/rate-limit';
import swagger from './plugins/swagger';

import accountRoutes from './routes/accounts';
import authRoutes from './routes/auth';
import backupRoutes from './routes/backup';
import healthRoutes from './routes/health';
import { createFastifyWinstonStream } from './infrastructure/logging/fastifyWinstonBridge';
import { logger } from './utils/logger';
import { getTrustProxyConfig, sanitizeHeaders } from './utils/security';

export async function build() {
  validateConfig();
  logConfig();

  const fastify = Fastify({
    logger: {
      level: env.LOGS.level,
      stream: createFastifyWinstonStream(),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'headers.authorization',
          'headers.cookie',
          'headers["x-api-key"]'
        ],
        censor: '[REDACTED]'
      },
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: sanitizeHeaders(req.headers as Record<string, unknown>),
          remoteAddress: req.ip,
          remotePort: req.socket?.remotePort || 0
        }),
        res: (res) => ({
          statusCode: res.statusCode
        })
      }
    },
    trustProxy: getTrustProxyConfig(env.NODE_ENV, process.env.TRUST_PROXY),
    ignoreTrailingSlash: true
  });

  await fastify.register(cors);
  await fastify.register(helmet);
  await fastify.register(swagger);
  await fastify.register(rateLimit);

  if (env.MONITORING.prometheusEnabled) {
    await fastify.register(prometheus);
  }

  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(accountRoutes, { prefix: '/api/accounts' });
  await fastify.register(backupRoutes, { prefix: '/api/backup' });

  fastify.get('/', async () => {
    return {
      name: 'Hell Authenticator API',
      version: '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: '/docs'
    };
  });

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;

    if (env.NODE_ENV === 'production' && statusCode >= 500) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      });
      return;
    }

    reply.status(statusCode).send({
      error: error.name || 'Error',
      message: error.message
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`
    });
  });

  return fastify;
}

async function start() {
  try {
    console.log(process.env.ENCRYPTION_KEY);
    console.log(process.env.ENCRYPTION_KEY?.length);
    console.log(/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY ?? ''));
    await initializeDatabase();
    await runMigrations();

    const fastify = await build();

    await fastify.listen({
      port: env.PORT,
      host: env.HOST
    });

    logger.info('Hell Authenticator API started successfully');
    logger.info('Application environment', { environment: env.NODE_ENV });
    logger.info('Application port', { port: env.PORT });
    logger.info('Application documentation endpoint', { url: `http://localhost:${env.PORT}/docs` });
    logger.info('Application health endpoint', { url: `http://localhost:${env.PORT}/health` });
  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  start();
}

