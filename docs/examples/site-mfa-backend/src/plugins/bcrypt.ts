import bcrypt from 'bcrypt';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    bcrypt: {
      hash: (plaintext: string, rounds: number) => Promise<string>;
      compare: (plaintext: string, hash: string) => Promise<boolean>;
    };
  }
}

export default fp(async (app) => {
  app.decorate('bcrypt', {
    hash: (plaintext: string, rounds: number) => bcrypt.hash(plaintext, rounds),
    compare: (plaintext: string, hash: string) => bcrypt.compare(plaintext, hash),
  });
});


