import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default async function routes(app: FastifyInstance): Promise<void> {
  app.post('/auth/register', async (req, rep) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return rep.code(400).send({ error: 'Invalid body' });
    const { email, password } = parsed.data;
    const exists = await app.prisma.user.findUnique({ where: { email } });
    if (exists) return rep.code(409).send({ error: 'Email already registered' });
    const passwordHash = await app.bcrypt.hash(password, 12);
    const user = await app.prisma.user.create({ data: { email, passwordHash, mfaEnabled: false, mfaStatus: 'NONE' } });
    return rep.code(201).send({ user: { id: user.id, email: user.email } });
  });

  app.post('/auth/login', async (req, rep) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return rep.code(400).send({ error: 'Invalid body' });
    const { email, password } = parsed.data;
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) return rep.code(401).send({ error: 'Invalid credentials' });
    const ok = await app.bcrypt.compare(password, user.passwordHash);
    if (!ok) return rep.code(401).send({ error: 'Invalid credentials' });

    if (user.mfaEnabled) {
      const challenge = await app.prisma.mfaChallenge.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
      return rep.send({ status: 'MFA_REQUIRED', challengeId: challenge.id });
    }

    const tokens = app.issueTokens(user.id);
    return rep.send({ user: { id: user.id, email: user.email }, tokens });
  });
}


