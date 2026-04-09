import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { JwtPayload, RequestUser } from '../types';

declare module 'fastify' {
  interface FastifyInstance {
    issueTokens(userId: string): { accessToken: string; refreshToken: string };
    authenticate: (req: import('fastify').FastifyRequest, rep: import('fastify').FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: RequestUser;
  }
}

export default fp(async (app) => {
  app.decorate('issueTokens', (userId: string) => {
    const accessToken = jwt.sign({ userId, type: 'access' } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId, type: 'refresh' } satisfies JwtPayload, env.JWT_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  });

  app.decorate('authenticate', async (req, rep) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return rep.code(401).send({ error: 'Unauthorized' });
    }
    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      if (!decoded.userId) throw new Error('Invalid token');
      const user = await app.prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return rep.code(401).send({ error: 'Unauthorized' });
      req.user = { id: user.id, email: user.email };
    } catch {
      return rep.code(401).send({ error: 'Unauthorized' });
    }
  });
});


