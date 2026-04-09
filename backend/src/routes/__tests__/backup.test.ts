import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const serviceMocks = {
  listBackups: jest.fn(),
  createBackup: jest.fn(),
  getBackup: jest.fn(),
  restoreBackup: jest.fn(),
  deleteBackup: jest.fn(),
  uploadToCloud: jest.fn(),
  downloadFromCloud: jest.fn(),
  getBackupStats: jest.fn(),
  cleanupExpiredBackups: jest.fn()
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
        cloudProvider: 'aws',
        cloudPath: 'users/user-1/backup-123.enc'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(serviceMocks.uploadToCloud).toHaveBeenCalledWith(
      'user-1',
      'backup-123',
      'aws',
      'users/user-1/backup-123.enc'
    );
  });

  it('maps upload backup not found to 404', async () => {
    serviceMocks.uploadToCloud.mockRejectedValue(new Error('Backup not found'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/backup/backup-404/upload-to-cloud',
      payload: { cloudProvider: 'aws', cloudPath: 'p' }
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
