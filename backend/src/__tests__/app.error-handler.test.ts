process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';

import { build } from '../app';

describe('app error handler contract', () => {
  jest.setTimeout(20000);

  it('preserves explicit statusCode for controlled errors', async () => {
    const app = await build();

    app.get('/__test-error-status', async () => {
      const error = new Error('Bad request payload') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/__test-error-status'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'Error',
      message: 'Bad request payload'
    });

    await app.close();
  });
});
