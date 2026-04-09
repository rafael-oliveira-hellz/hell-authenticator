import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { env } from '../config/environment';

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: env.SECURITY.rateLimitMax,
    timeWindow: env.SECURITY.rateLimitWindow,
    allowList: ['127.0.0.1', 'localhost'],
    keyGenerator: (request) => {
      // Usar IP do usuário como chave
      return request.ip;
    },
    errorResponseBuilder: (request, context) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
        retryAfter: context.after
      };
    },
    onExceeded: (request, _reply) => {
      fastify.log.warn('Rate limit exceeded for IP: %s, URL: %s, Method: %s', 
        request.ip, request.url, request.method);
    }
  });
});

