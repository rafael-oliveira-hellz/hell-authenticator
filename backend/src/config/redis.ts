import { createClient, RedisClientType } from 'redis';
import { env } from './environment';

let redisClient: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS.url });
    redisClient.on('error', () => {
      // Error handled by health checks and callers.
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};

export const checkRedisHealth = async (): Promise<'healthy' | 'unhealthy'> => {
  try {
    const client = await getRedisClient();
    const pong = await client.ping();
    return pong === 'PONG' ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
};
