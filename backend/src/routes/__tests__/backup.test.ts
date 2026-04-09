import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const serviceMocks = {
  listBackups: jest.fn(),
  listCloudProviders: jest.fn(),
  createBackup: jest.fn(),
  getBackup: jest.fn(),
  restoreBackup: jest.fn(),
  deleteBackup: jest.fn(),
  uploadToCloud: jest.fn(),
  downloadFromCloud: jest.fn(),
  getBackupStats: jest.fn(),
  cleanupExpiredBackups: jest.fn()
};

const userCloudConnectionServiceMocks = {
  listConnections: jest.fn(),
  connectProvider: jest.fn(),
  disconnectProvider: jest.fn(),
};

const userCloudOAuthServiceMocks = {
  startAuthorization: jest.fn(),
  handleCallback: jest.fn(),
};

type MockUser = { id: string; isPremium: boolean; email: string } | null;
let currentUser: MockUser = {
  id: 'user-1',
  isPremium: true,
  email: 'user1@example.com'
};
let premiumDenied = false;

const authenticateMock = jest.fn(async (request: FastifyRequest, _reply: FastifyReply) => {
  if (currentUser) {
    (request as FastifyRequest & { user?: { id: string; isPremium: boolean; email: string } }).user = currentUser;
  }
});

const requirePremiumMock = jest.fn(async (_request: FastifyRequest, reply: FastifyReply) => {
  if (premiumDenied) {
    reply.status(403).send({ error: 'Forbidden', message: 'Premium required' });
  }
});

jest.mock('../../services/BackupService', () => ({
  BackupService: jest.fn().mockImplementation(() => serviceMocks)
}));

jest.mock('../../services/UserCloudConnectionService', () => ({
  UserCloudConnectionService: jest.fn().mockImplementation(() => userCloudConnectionServiceMocks),
}));

jest.mock('../../services/UserCloudOAuthService', () => ({
  UserCloudOAuthService: jest.fn().mockImplementation(() => userCloudOAuthServiceMocks),
}));

jest.mock('../../middlewares/auth', () => ({
  authMiddleware: {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => authenticateMock(request, reply),
    requirePremium: (request: FastifyRequest, reply: FastifyReply) => requirePremiumMock(request, reply)
  }
}));

import backupRoutes from '../backup';

describe('backup routes contract and authz regressions', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    currentUser = {
      id: 'user-1',
      isPremium: true,
      email: 'user1@example.com'
    };
    premiumDenied = false;
    app = Fastify();
    await app.register(backupRoutes, { prefix: '/api/backup' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 when user is missing', async () => {
    currentUser = null;

    const response = await app.inject({ method: 'GET', url: '/api/backup' });

    expect(response.statusCode).toBe(401);
  });

  it('lists backups', async () => {
    serviceMocks.listBackups.mockResolvedValue([{ id: 'b1' }]);

    const response = await app.inject({ method: 'GET', url: '/api/backup' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ backups: [{ id: 'b1' }] });
  });

  it('lists cloud providers', async () => {
    serviceMocks.listCloudProviders.mockResolvedValue([
      { id: 'gcp', label: 'Nuvem do app', verificationStatus: 'verified' }
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/backup/providers' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      providers: [{ id: 'gcp', label: 'Nuvem do app', verificationStatus: 'verified' }]
    });
  });

  it('lists user cloud connections', async () => {
    userCloudConnectionServiceMocks.listConnections.mockResolvedValue([
      { id: 'conn-1', provider: 'google-drive', status: 'connected' },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/backup/user-cloud-connections' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      connections: [{ id: 'conn-1', provider: 'google-drive', status: 'connected' }],
    });
  });

  it('connects a user cloud provider', async () => {
    userCloudConnectionServiceMocks.connectProvider.mockResolvedValue({
      id: 'conn-1',
      provider: 'google-drive',
      status: 'connected',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/user-cloud-connections/connect',
      payload: {
        provider: 'google-drive',
        accessToken: 'token-value',
        accountEmail: 'user@example.com',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(userCloudConnectionServiceMocks.connectProvider).toHaveBeenCalledWith('user-1', {
      provider: 'google-drive',
      accessToken: 'token-value',
      accountEmail: 'user@example.com',
    });
  });

  it('disconnects a user cloud provider', async () => {
    userCloudConnectionServiceMocks.disconnectProvider.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/backup/user-cloud-connections/google-drive',
    });

    expect(response.statusCode).toBe(200);
    expect(userCloudConnectionServiceMocks.disconnectProvider).toHaveBeenCalledWith('user-1', 'google-drive');
  });

  it('starts user cloud oauth authorization', async () => {
    userCloudOAuthServiceMocks.startAuthorization.mockResolvedValue({
      provider: 'google-drive',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/user-cloud-connections/oauth/start',
      payload: {
        provider: 'google-drive',
        successRedirectUri: 'hellauthenticator://cloud/success',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(userCloudOAuthServiceMocks.startAuthorization).toHaveBeenCalledWith('user-1', {
      provider: 'google-drive',
      successRedirectUri: 'hellauthenticator://cloud/success',
    });
  });

  it('delegates oauth callback handling', async () => {
    userCloudOAuthServiceMocks.handleCallback.mockImplementation(async (_query, reply) => {
      reply.status(200).send({ ok: true });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/backup/user-cloud-connections/oauth/callback?code=abc&state=xyz',
    });

    expect(response.statusCode).toBe(200);
    expect(userCloudOAuthServiceMocks.handleCallback).toHaveBeenCalled();
  });

  it('returns 500 when listing backups fails', async () => {
    serviceMocks.listBackups.mockRejectedValue(new Error('boom'));

    const response = await app.inject({ method: 'GET', url: '/api/backup' });

    expect(response.statusCode).toBe(500);
  });

  it('creates backup', async () => {
    serviceMocks.createBackup.mockResolvedValue({ id: 'new-backup' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup',
      payload: { description: 'manual', type: 'manual' }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ backup: { id: 'new-backup' } });
  });

  it('returns 400 on create backup error', async () => {
    serviceMocks.createBackup.mockRejectedValue(new Error('invalid backup'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup',
      payload: { description: 'manual', type: 'manual' }
    });

    expect(response.statusCode).toBe(400);
  });

  it('gets backup', async () => {
    serviceMocks.getBackup.mockResolvedValue({ id: 'backup-1' });

    const response = await app.inject({ method: 'GET', url: '/api/backup/backup-1' });

    expect(response.statusCode).toBe(200);
  });

  it('maps get backup not found to 404', async () => {
    serviceMocks.getBackup.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({ method: 'GET', url: '/api/backup/backup-404' });

    expect(response.statusCode).toBe(404);
  });

  it('maps invalid password during restore to 401', async () => {
    serviceMocks.restoreBackup.mockRejectedValue(new Error('Invalid password'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-123/restore',
      payload: {
        password: 'wrong-pass'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(serviceMocks.restoreBackup).toHaveBeenCalledWith(
      'user-1',
      'backup-123',
      { password: 'wrong-pass' }
    );
  });

  it('maps restore not found to 404', async () => {
    serviceMocks.restoreBackup.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-404/restore',
      payload: { password: 'pass' }
    });

    expect(response.statusCode).toBe(404);
  });

  it('restores backup successfully', async () => {
    serviceMocks.restoreBackup.mockResolvedValue({ restoredCount: 2 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-1/restore',
      payload: { password: 'ok' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: 'Backup restored successfully', restoredCount: 2 });
  });

  it('deletes backup', async () => {
    serviceMocks.deleteBackup.mockResolvedValue(undefined);

    const response = await app.inject({ method: 'DELETE', url: '/api/backup/backup-1' });

    expect(response.statusCode).toBe(200);
  });

  it('maps delete backup not found to 404', async () => {
    serviceMocks.deleteBackup.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({ method: 'DELETE', url: '/api/backup/backup-404' });

    expect(response.statusCode).toBe(404);
  });

  it('passes authenticated user id to uploadToCloud', async () => {
    serviceMocks.uploadToCloud.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-123/upload-to-cloud',
      payload: {
        cloudProvider: 'gcp',
        cloudPath: 'users/user-1/backup-123.enc'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(serviceMocks.uploadToCloud).toHaveBeenCalledWith(
      'user-1',
      'backup-123',
      'gcp',
      'users/user-1/backup-123.enc'
    );
  });

  it('maps upload backup not found to 404', async () => {
    serviceMocks.uploadToCloud.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-404/upload-to-cloud',
      payload: { cloudProvider: 'gcp', cloudPath: 'p' }
    });

    expect(response.statusCode).toBe(404);
  });

  it('maps backup not found during cloud download to 404', async () => {
    serviceMocks.downloadFromCloud.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/backup/backup-404/download-from-cloud'
    });

    expect(response.statusCode).toBe(404);
    expect(serviceMocks.downloadFromCloud).toHaveBeenCalledWith('user-1', 'backup-404');
  });

  it('maps backup not stored in cloud to 400', async () => {
    serviceMocks.downloadFromCloud.mockRejectedValue(new Error('Backup is not stored in cloud'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/backup/backup-1/download-from-cloud'
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns cloud download payload on success', async () => {
    serviceMocks.downloadFromCloud.mockResolvedValue('encrypted-data');

    const response = await app.inject({
      method: 'GET',
      url: '/api/backup/backup-1/download-from-cloud'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: 'Backup downloaded from cloud successfully',
      data: 'encrypted-data'
    });
  });

  it('returns backup stats', async () => {
    serviceMocks.getBackupStats.mockResolvedValue({ totalBackups: 3 });

    const response = await app.inject({ method: 'GET', url: '/api/backup/stats' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ stats: { totalBackups: 3 } });
  });

  it('scopes cleanupExpiredBackups to authenticated user', async () => {
    serviceMocks.cleanupExpiredBackups.mockResolvedValue(2);

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/cleanup-expired'
    });

    expect(response.statusCode).toBe(200);
    expect(serviceMocks.cleanupExpiredBackups).toHaveBeenCalledWith('user-1');
  });

  it('returns 403 when requirePremium denies request', async () => {
    premiumDenied = true;

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/cleanup-expired'
    });

    expect(response.statusCode).toBe(403);
  });
});
