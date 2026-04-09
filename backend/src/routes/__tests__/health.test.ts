import Fastify, { FastifyInstance } from 'fastify';

const healthCheckMock = jest.fn();
const redisHealthMock = jest.fn();

jest.mock('../../config/database', () => ({
  healthCheck: () => healthCheckMock()
}));

jest.mock('../../config/redis', () => ({
  checkRedisHealth: () => redisHealthMock()
}));

jest.mock('../../config/environment', () => ({
  env: {
    NODE_ENV: 'test'
  }
}));

import healthRoutes from '../health';

describe('health routes contract', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify();
    await app.register(healthRoutes, { prefix: '/health' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns ready when dependencies are healthy', async () => {
    healthCheckMock.mockResolvedValue({ status: 'healthy', timestamp: new Date().toISOString() });
    redisHealthMock.mockResolvedValue('healthy');

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  });

  it('fails readiness with 503 when redis is unhealthy', async () => {
    healthCheckMock.mockResolvedValue({ status: 'healthy', timestamp: new Date().toISOString() });
    redisHealthMock.mockResolvedValue('unhealthy');

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'not_ready',
      services: {
        database: 'healthy',
        redis: 'unhealthy'
      }
    });
  });
});
