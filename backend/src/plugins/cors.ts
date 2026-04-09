import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { env } from '../config/environment';

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: env.CORS.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-Total-Count'
    ],
    maxAge: 86400 // 24 horas
  });
});
