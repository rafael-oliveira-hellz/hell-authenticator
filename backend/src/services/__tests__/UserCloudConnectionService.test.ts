jest.mock('../../config/environment', () => ({
  env: {
    ENCRYPTION: { key: '0123456789abcdef0123456789abcdef' },
  },
}));

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const encryptionMock = {
  encrypt: jest.fn(),
};

jest.mock('../EncryptionService', () => ({
  EncryptionService: jest.fn().mockImplementation(() => encryptionMock),
}));

import { AppDataSource } from '../../config/database';
import { UserCloudConnectionService } from '../UserCloudConnectionService';

describe('UserCloudConnectionService', () => {
  const connectionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(connectionRepository);
    encryptionMock.encrypt.mockImplementation((value: string) => `encrypted:${value}`);
  });

  it('lists saved user cloud connections', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const service = new UserCloudConnectionService();

    connectionRepository.find.mockResolvedValue([
      {
        id: 'conn-1',
        provider: 'google-drive',
        status: 'connected',
        accountEmail: 'user@example.com',
        externalAccountId: 'ext-1',
        expiresAt: new Date('2026-04-10T10:00:00.000Z'),
        lastVerifiedAt: now,
        scopes: ['files.readwrite'],
        metadata: { folderId: 'folder-1' },
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await service.listConnections('user-1');

    expect(connectionRepository.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { provider: 'ASC' },
    });
    expect(result[0]).toMatchObject({
      id: 'conn-1',
      provider: 'google-drive',
      status: 'connected',
      accountEmail: 'user@example.com',
    });
  });

  it('creates a new encrypted connection when provider is not connected yet', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const service = new UserCloudConnectionService();
    const createdConnection = {
      id: 'conn-1',
      userId: 'user-1',
      provider: 'google-drive',
      status: 'disconnected',
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accountEmail: null,
      externalAccountId: null,
      expiresAt: null,
      lastVerifiedAt: null,
      scopes: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    connectionRepository.findOne.mockResolvedValue(null);
    connectionRepository.create.mockReturnValue(createdConnection);
    connectionRepository.save.mockImplementation(async (entity: typeof createdConnection) => {
      entity.updatedAt = now;
      return entity;
    });

    const result = await service.connectProvider('user-1', {
      provider: 'google-drive',
      accessToken: 'google-token',
      refreshToken: 'refresh-token',
      accountEmail: 'user@example.com',
      externalAccountId: 'google-1',
      expiresAt: '2026-04-10T10:00:00.000Z',
      scopes: ['drive.file'],
      metadata: { folderId: 'folder-1' },
    });

    expect(connectionRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: 'google-drive',
    });
    expect(encryptionMock.encrypt).toHaveBeenCalledWith('google-token');
    expect(encryptionMock.encrypt).toHaveBeenCalledWith('refresh-token');
    expect(connectionRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      provider: 'google-drive',
      status: 'connected',
      accountEmail: 'user@example.com',
      externalAccountId: 'google-1',
    });
  });

  it('rejects blank access tokens', async () => {
    const service = new UserCloudConnectionService();

    await expect(
      service.connectProvider('user-1', {
        provider: 'google-drive',
        accessToken: '   ',
      })
    ).rejects.toThrow('Access token is required');
  });

  it('disconnects an existing Google Drive connection and clears stored tokens', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    const service = new UserCloudConnectionService();
    const existingConnection = {
      id: 'conn-1',
      userId: 'user-1',
      provider: 'google-drive',
      status: 'connected',
      encryptedAccessToken: 'encrypted:token',
      encryptedRefreshToken: 'encrypted:refresh',
      accountEmail: 'user@example.com',
      externalAccountId: 'od-1',
      expiresAt: now,
      lastVerifiedAt: now,
      scopes: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    connectionRepository.findOne.mockResolvedValue(existingConnection);
    connectionRepository.save.mockResolvedValue(existingConnection);

    await service.disconnectProvider('user-1', 'google-drive');

    expect(existingConnection.status).toBe('disconnected');
    expect(existingConnection.encryptedAccessToken).toBeNull();
    expect(existingConnection.encryptedRefreshToken).toBeNull();
    expect(existingConnection.expiresAt).toBeNull();
    expect(existingConnection.lastVerifiedAt).toBeNull();
    expect(connectionRepository.save).toHaveBeenCalledWith(existingConnection);
  });

  it('throws when disconnect target does not exist', async () => {
    const service = new UserCloudConnectionService();
    connectionRepository.findOne.mockResolvedValue(null);

    await expect(service.disconnectProvider('user-1', 'google-drive')).rejects.toThrow(
      'User cloud connection not found'
    );
  });
});
