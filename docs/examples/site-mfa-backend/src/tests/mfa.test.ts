import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import auth from '../plugins/auth.js';
import bcrypt from '../plugins/bcrypt.js';
import prisma from '../plugins/prisma.js';
import authRoutes from '../routes/auth.js';
import mfaRoutes from '../routes/mfa.js';

// Minimal e2e-style test scaffold using Fastify inject()

async function build() {
  const app = Fastify();
  await app.register(prisma);
  await app.register(bcrypt);
  await app.register(auth);
  await app.register(authRoutes);
  await app.register(mfaRoutes);
  return app;
}

async function resetDb(client: PrismaClient) {
  await client.mfaChallenge.deleteMany();
  await client.user.deleteMany();
}

// Example flow (pseudo): register -> login -> setup -> verify-setup -> login (MFA_REQUIRED) -> verify-login
export async function runMfaFlowTest() {
  const app = await build();
  await resetDb(app.prisma);

  // Register
  const r1 = await app.inject({ method: 'POST', url: '/auth/register', payload: { email: 'a@b.com', password: 'Passw0rd!' } });
  if (r1.statusCode !== 201) throw new Error('register failed');

  // Login
  const r2 = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'a@b.com', password: 'Passw0rd!' } });
  if (r2.statusCode !== 200) throw new Error('login failed');
  const { tokens } = r2.json() as any;

  // Setup
  const r3 = await app.inject({ method: 'POST', url: '/mfa/setup', headers: { authorization: `Bearer ${tokens.accessToken}` } });
  if (r3.statusCode !== 200) throw new Error('setup failed');

  // Verify-setup should fail with wrong code
  const r4 = await app.inject({ method: 'POST', url: '/mfa/verify-setup', headers: { authorization: `Bearer ${tokens.accessToken}` }, payload: { code: '000000' } });
  if (r4.statusCode === 200) throw new Error('verify-setup should not accept wrong code');

  await app.close();
}


