import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import bcrypt from './plugins/bcrypt.js';
import prisma from './plugins/prisma.js';
import authRoutes from './routes/auth.js';
import mfaRoutes from './routes/mfa.js';

async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(sensible);
  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(prisma);
  await app.register(bcrypt);
  await app.register(authPlugin);

  await app.register(authRoutes);
  await app.register(mfaRoutes);

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}

buildServer()
  .then((app) => app.listen({ port: env.PORT, host: '0.0.0.0' }))
  .then((addr) => console.log(`Server listening at ${addr}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


