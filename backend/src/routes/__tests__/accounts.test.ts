import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const accountServiceMocks = {
  listAccounts: jest.fn(),
  createAccount: jest.fn(),
  getAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
  incrementUsage: jest.fn(),
  searchAccounts: jest.fn(),
  getAccountStats: jest.fn(),
  getBackupData: jest.fn()
};

type MockUser = { id: string; email: string; isPremium: boolean } | null;
let currentUser: MockUser = {
  id: 'user-1',
  email: 'user1@example.com',
  isPremium: true
};

const authenticateMock = jest.fn(async (request: FastifyRequest, _reply: FastifyReply) => {
  if (currentUser) {
    (request as FastifyRequest & { user?: { id: string; email: string; isPremium: boolean } }).user = currentUser;
  }
});

jest.mock('../../services/AccountService', () => ({
  AccountService: jest.fn().mockImplementation(() => accountServiceMocks)
}));

jest.mock('../../middlewares/auth', () => ({
  authMiddleware: {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => authenticateMock(request, reply)
  }
}));

import accountRoutes from '../accounts';

describe('accounts routes contract', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    currentUser = {
      id: 'user-1',
      email: 'user1@example.com',
      isPremium: true
    };
    app = Fastify();
    await app.register(accountRoutes, { prefix: '/api/accounts' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 when user is missing', async () => {
    currentUser = null;

    const response = await app.inject({ method: 'GET', url: '/api/accounts' });

    expect(response.statusCode).toBe(401);
  });

  it('lists accounts', async () => {
    accountServiceMocks.listAccounts.mockResolvedValue([{ id: 'a1' }]);

    const response = await app.inject({ method: 'GET', url: '/api/accounts' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ accounts: [{ id: 'a1' }] });
  });

  it('returns 500 when list fails', async () => {
    accountServiceMocks.listAccounts.mockRejectedValue(new Error('boom'));

    const response = await app.inject({ method: 'GET', url: '/api/accounts' });

    expect(response.statusCode).toBe(500);
  });

  it('rejects invalid period outside enum', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 20
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('creates account with valid payload', async () => {
    accountServiceMocks.createAccount.mockResolvedValue({ id: 'created' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ account: { id: 'created' } });
  });

  it('creates account without secret when backend should generate one', async () => {
    accountServiceMocks.createAccount.mockResolvedValue({ id: 'generated' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: {
        name: 'Discord',
        period: 30
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ account: { id: 'generated' } });
  });

  it('returns 409 when create account conflicts', async () => {
    accountServiceMocks.createAccount.mockRejectedValue(new Error('Account with this name already exists'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      }
    });

    expect(response.statusCode).toBe(409);
  });

  it('returns 400 for generic create validation error', async () => {
    accountServiceMocks.createAccount.mockRejectedValue(new Error('invalid payload'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts',
      payload: {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('maps account not found to 404', async () => {
    accountServiceMocks.getAccount.mockRejectedValue(new Error('Account not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/account-404'
    });

    expect(response.statusCode).toBe(404);
  });

  it('maps unknown get error to 500', async () => {
    accountServiceMocks.getAccount.mockRejectedValue(new Error('unexpected'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/account-500'
    });

    expect(response.statusCode).toBe(500);
  });

  it('updates account', async () => {
    accountServiceMocks.updateAccount.mockResolvedValue({ id: 'updated' });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/accounts/account-1',
      payload: { name: 'New name' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ account: { id: 'updated' } });
  });

  it('maps update not found to 404', async () => {
    accountServiceMocks.updateAccount.mockRejectedValue(new Error('Account not found'));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/accounts/account-404',
      payload: { name: 'x' }
    });

    expect(response.statusCode).toBe(404);
  });

  it('maps update conflict to 409', async () => {
    accountServiceMocks.updateAccount.mockRejectedValue(new Error('Account already exists'));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/accounts/account-409',
      payload: { name: 'x' }
    });

    expect(response.statusCode).toBe(409);
  });

  it('maps update bad request to 400', async () => {
    accountServiceMocks.updateAccount.mockRejectedValue(new Error('invalid data'));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/accounts/account-400',
      payload: { name: 'x' }
    });

    expect(response.statusCode).toBe(400);
  });

  it('deletes account', async () => {
    accountServiceMocks.deleteAccount.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/accounts/account-1'
    });

    expect(response.statusCode).toBe(200);
  });

  it('maps delete not found to 404', async () => {
    accountServiceMocks.deleteAccount.mockRejectedValue(new Error('Account not found'));

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/accounts/account-404'
    });

    expect(response.statusCode).toBe(404);
  });

  it('increments usage', async () => {
    accountServiceMocks.incrementUsage.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/account-1/increment-usage'
    });

    expect(response.statusCode).toBe(200);
  });

  it('maps increment not found to 404', async () => {
    accountServiceMocks.incrementUsage.mockRejectedValue(new Error('Account not found'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/accounts/account-404/increment-usage'
    });

    expect(response.statusCode).toBe(404);
  });

  it('forwards search query q to service', async () => {
    accountServiceMocks.searchAccounts.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/search?q=git'
    });

    expect(response.statusCode).toBe(200);
    expect(accountServiceMocks.searchAccounts).toHaveBeenCalledWith('user-1', 'git');
  });

  it('returns 400 when search query is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/search'
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns stats', async () => {
    accountServiceMocks.getAccountStats.mockResolvedValue({ total: 1 });

    const response = await app.inject({ method: 'GET', url: '/api/accounts/stats' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ stats: { total: 1 } });
  });

  it('returns backup-data payload without secret contract leak', async () => {
    accountServiceMocks.getBackupData.mockResolvedValue({
      name: 'Github',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      hasMetadata: false
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/account-1/backup-data'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      backupData: {
        name: 'Github',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        hasMetadata: false
      }
    });
  });

  it('maps backup-data not found to 404', async () => {
    accountServiceMocks.getBackupData.mockRejectedValue(new Error('Account not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/accounts/account-404/backup-data'
    });

    expect(response.statusCode).toBe(404);
  });
});
