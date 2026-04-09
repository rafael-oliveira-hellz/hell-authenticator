import { FastifyInstance } from 'fastify';
import { healthCheck } from '../config/database';
import { env } from '../config/environment';
import { checkRedisHealth } from '../config/redis';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: '1.0.0'
    };
  });

  fastify.get('/detailed', async () => {
    const dbHealth = await healthCheck();
    const redisHealth = await checkRedisHealth();

    return {
      status: dbHealth.status === 'healthy' && redisHealth === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: '1.0.0',
      services: {
        database: dbHealth,
        redis: redisHealth,
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        }
      }
    };
  });

  fastify.get('/ready', async (_request, reply) => {
    const dbHealth = await healthCheck();
    const redisHealth = await checkRedisHealth();

    if (dbHealth.status !== 'healthy' || redisHealth !== 'healthy') {
      return reply.status(503).send({
        status: 'not_ready',
        services: {
          database: dbHealth.status,
          redis: redisHealth
        }
      });
    }

    return { status: 'ready' };
  });

  fastify.get('/live', async () => {
    return { status: 'alive' };
  });
}
