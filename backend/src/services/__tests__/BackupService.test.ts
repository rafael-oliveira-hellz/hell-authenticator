jest.mock('../../config/environment', () => ({
  env: {
    ENCRYPTION: { key: '0123456789abcdef0123456789abcdef' }
  }
}));

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn()
}));

const loggerError = jest.fn();

jest.mock('../../utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerError(...args)
  }
}));

const encryptionMock = {
  encryptBackupData: jest.fn(),
  decryptBackupData: jest.fn()
};

const accountServiceMock = {
  getDecryptedBackupData: jest.fn(),
  restoreFromBackup: jest.fn()
};

const cloudRegistryMock = {
  list: jest.fn(),
  get: jest.fn()
};

const cloudProviderMock = {
  buildDefaultPath: jest.fn(),
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  descriptor: {
    id: 'gcp',
    label: 'Nuvem do app',
    description: 'local dev',
    authMode: 'bearer-token',
    connectionStatus: 'connected',
    verificationStatus: 'verified',
    supportsAutomaticSetup: true,
    supportsCustomPath: true,
    requiredEnvVars: [],
    setupInstructions: []
  }
};

jest.mock('../EncryptionService', () => ({
  EncryptionService: jest.fn().mockImplementation(() => encryptionMock)
}));

jest.mock('../AccountService', () => ({
  AccountService: jest.fn().mockImplementation(() => accountServiceMock)
}));

jest.mock('../cloud/CloudBackupProviderRegistry', () => ({
  CloudBackupProviderRegistry: jest.fn().mockImplementation(() => cloudRegistryMock)
}));

import { compare } from 'bcrypt';
import { AppDataSource } from '../../config/database';
import { BackupService } from '../BackupService';

describe('BackupService', () => {
  const backupRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    create: jest.fn()
  };

  const userRepository = {
    findOne: jest.fn()
  };

  const accountRepository = {
    find: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cloudRegistryMock.list.mockResolvedValue([cloudProviderMock.descriptor]);
    cloudRegistryMock.get.mockReturnValue(cloudProviderMock);
    cloudProviderMock.buildDefaultPath.mockReturnValue('user-1/2026-01-01/backup-1.enc');
    cloudProviderMock.upload.mockResolvedValue(undefined);
    cloudProviderMock.download.mockResolvedValue('encrypted-cloud-payload');
    cloudProviderMock.delete.mockResolvedValue(undefined);

    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(backupRepository)
      .mockReturnValueOnce(userRepository)
      .mockReturnValueOnce(accountRepository);
  });

  it('lists backups for active user', async () => {
    const service = new BackupService();
    backupRepository.find.mockResolvedValue([
      {
        id: 'backup-1',
        description: 'd',
        type: 'local',
        cloudProvider: null,
        cloudPath: null,
        size: 10,
        checksum: 'abc',
        version: '1.0.0',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-10T00:00:00.000Z')
      }
    ]);

    const result = await service.listBackups('user-1');

    expect(result).toHaveLength(1);
    expect(backupRepository.find).toHaveBeenCalledWith({
      where: { userId: 'user-1', isActive: true },
      order: { createdAt: 'DESC' }
    });
  });

  it('lists available cloud providers', async () => {
    const service = new BackupService();

    const result = await service.listCloudProviders();

    expect(result).toEqual([cloudProviderMock.descriptor]);
    expect(cloudRegistryMock.list).toHaveBeenCalledTimes(1);
  });

  it('returns backup by id', async () => {
    const service = new BackupService();
    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      description: 'd',
      type: 'local',
      cloudProvider: null,
      cloudPath: null,
      size: 10,
      checksum: 'abc',
      version: '1.0.0',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-10T00:00:00.000Z')
    });

    const result = await service.getBackup('user-1', 'backup-1');

    expect(result.id).toBe('backup-1');
  });

  it('throws when backup is not found in getBackup', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue(null);

    await expect(service.getBackup('user-1', 'missing')).rejects.toThrow('Backup not found');
  });

  it('rejects createBackup when user does not exist', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.createBackup('user-1', { description: 'backup', type: 'manual' })).rejects.toThrow('User not found');
  });

  it('rejects createBackup with empty description', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(service.createBackup('user-1', { description: '   ', type: 'manual' })).rejects.toThrow('Backup description is required');
  });

  it('rejects createBackup with invalid type', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(service.createBackup('user-1', { description: 'x', type: 'weird' as 'manual' })).rejects.toThrow('Invalid backup type. Must be local, cloud, or manual');
  });

  it('rejects createBackup cloud type with invalid provider', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(
      service.createBackup('user-1', { description: 'x', type: 'cloud', cloudProvider: 'aws' as never, cloudPath: '/p' })
    ).rejects.toThrow('Invalid cloud provider');
  });

  it('rejects createBackup cloud type with empty cloudPath when provided', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(
      service.createBackup('user-1', { description: 'x', type: 'cloud', cloudProvider: 'gcp', cloudPath: '   ' })
    ).rejects.toThrow('Cloud path cannot be empty when provided');
  });

  it('rejects createBackup with invalid retention days', async () => {
    const service = new BackupService();
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(service.createBackup('user-1', { description: 'x', type: 'manual', retentionDays: 366 })).rejects.toThrow('Retention days must be between 1 and 365');
  });

  it('creates backup successfully when user and accounts exist', async () => {
    const service = new BackupService();
    const now = new Date();

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      preferences: {}
    });

    accountRepository.find.mockResolvedValue([{ id: 'acc-1' }]);
    accountServiceMock.getDecryptedBackupData.mockResolvedValue({
      name: 'Github',
      secret: 'RAWSECRET',
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    encryptionMock.encryptBackupData.mockReturnValue('encrypted-backup-data');

    backupRepository.create.mockReturnValue({
      id: 'backup-1',
      description: 'Daily backup',
      type: 'local',
      cloudProvider: null,
      cloudPath: null,
      size: 120,
      checksum: 'abc',
      version: '1.0.0',
      createdAt: now,
      expiresAt: now,
      isActive: true
    });

    backupRepository.save.mockResolvedValue(undefined);

    const result = await service.createBackup('user-1', {
      description: 'Daily backup',
      type: 'local'
    });

    expect(result.id).toBe('backup-1');
    expect(backupRepository.create).toHaveBeenCalled();
    expect(backupRepository.save).toHaveBeenCalledTimes(1);
  });

  it('creates cloud backup and uploads with generated path when cloudPath is omitted', async () => {
    const service = new BackupService();
    const now = new Date('2026-01-01T00:00:00.000Z');

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      preferences: {}
    });

    accountRepository.find.mockResolvedValue([{ id: 'acc-1' }]);
    accountServiceMock.getDecryptedBackupData.mockResolvedValue({
      name: 'Github',
      secret: 'RAWSECRET',
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    encryptionMock.encryptBackupData.mockReturnValue('encrypted-backup-data');

    const backupEntity = {
      id: 'backup-1',
      description: 'Cloud backup',
      type: 'cloud',
      cloudProvider: null,
      cloudPath: null,
      size: 120,
      checksum: 'abc',
      version: '1.0.0',
      createdAt: now,
      expiresAt: now,
      isActive: true
    };

    backupRepository.create.mockReturnValue(backupEntity);
    backupRepository.save.mockResolvedValue(undefined);

    const result = await service.createBackup('user-1', {
      description: 'Cloud backup',
      type: 'cloud',
      cloudProvider: 'gcp'
    });

    expect(cloudProviderMock.buildDefaultPath).toHaveBeenCalledWith({
      userId: 'user-1',
      backupId: 'backup-1',
      createdAt: now
    });
    expect(cloudProviderMock.upload).toHaveBeenCalledWith({
      userId: 'user-1',
      backupId: 'backup-1',
      data: 'encrypted-backup-data',
      cloudPath: 'user-1/2026-01-01/backup-1.enc'
    });
    expect(result.cloudProvider).toBe('gcp');
    expect(result.cloudPath).toBe('user-1/2026-01-01/backup-1.enc');
    expect(backupRepository.save).toHaveBeenCalledTimes(2);
  });

  it('rejects createBackup when account list is empty', async () => {
    const service = new BackupService();

    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });
    accountRepository.find.mockResolvedValue([]);

    await expect(
      service.createBackup('user-1', { description: 'backup', type: 'manual' })
    ).rejects.toThrow('No accounts to backup');
  });

  it('rejects restoreBackup when backup is expired', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({ id: 'backup-1', userId: 'user-1', data: 'encrypted-data', isExpired: () => true });

    await expect(service.restoreBackup('user-1', 'backup-1', { password: 'x' })).rejects.toThrow('Backup has expired');
  });

  it('rejects restoreBackup when user not found', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({ id: 'backup-1', userId: 'user-1', data: 'encrypted-data', isExpired: () => false });
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.restoreBackup('user-1', 'backup-1', { password: 'x' })).rejects.toThrow('User not found');
  });

  it('rejects restoreBackup when password is invalid', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      userId: 'user-1',
      data: 'encrypted-data',
      isExpired: () => false
    });

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      passwordHash: 'hashed-password'
    });

    (compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.restoreBackup('user-1', 'backup-1', { password: 'wrong-pass' })
    ).rejects.toThrow('Invalid password');
  });

  it('rejects restoreBackup when backup structure is invalid', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      userId: 'user-1',
      data: 'encrypted-data',
      isExpired: () => false
    });

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      isActive: true,
      passwordHash: 'hashed-password'
    });

    (compare as jest.Mock).mockResolvedValue(true);
    encryptionMock.decryptBackupData.mockReturnValue({ version: '1.0.0' });

    await expect(
      service.restoreBackup('user-1', 'backup-1', { password: 'correct-pass' })
    ).rejects.toThrow('Invalid backup data structure');
  });

  it('restores accounts and skips duplicates', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({ id: 'backup-1', userId: 'user-1', data: 'encrypted-data', isExpired: () => false });
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true, passwordHash: 'hash' });
    (compare as jest.Mock).mockResolvedValue(true);
    encryptionMock.decryptBackupData.mockReturnValue({
      accounts: [{ name: 'A' }, { name: 'B' }]
    });
    accountServiceMock.restoreFromBackup
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('already exists'));

    const result = await service.restoreBackup('user-1', 'backup-1', { password: 'ok' });

    expect(result).toEqual({ restoredAccounts: 1, skippedAccounts: 1 });
  });

  it('propagates non-duplicate restore errors', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({ id: 'backup-1', userId: 'user-1', data: 'encrypted-data', isExpired: () => false });
    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true, passwordHash: 'hash' });
    (compare as jest.Mock).mockResolvedValue(true);
    encryptionMock.decryptBackupData.mockReturnValue({ accounts: [{ name: 'A' }] });
    accountServiceMock.restoreFromBackup.mockRejectedValue(new Error('db down'));

    await expect(service.restoreBackup('user-1', 'backup-1', { password: 'ok' })).rejects.toThrow('db down');
  });

  it('throws when deleteBackup does not find backup', async () => {
    const service = new BackupService();
    backupRepository.findOne.mockResolvedValue(null);

    await expect(service.deleteBackup('user-1', 'missing')).rejects.toThrow('Backup not found');
  });

  it('deletes cloud backup and marks inactive', async () => {
    const service = new BackupService();

    const backup = { id: 'b1', userId: 'user-1', type: 'cloud', cloudProvider: 'gcp', cloudPath: '/x', isActive: true };
    backupRepository.findOne.mockResolvedValue(backup);

    await service.deleteBackup('user-1', 'b1');

    expect(cloudProviderMock.delete).toHaveBeenCalledWith({
      userId: 'user-1',
      backupId: 'b1',
      cloudPath: '/x'
    });
    expect(backup.isActive).toBe(false);
    expect(backupRepository.save).toHaveBeenCalledWith(backup);
  });

  it('scopes uploadToCloud lookup by userId', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      userId: 'user-1',
      cloudProvider: null,
      cloudPath: null,
      type: 'manual'
    });
    backupRepository.save.mockResolvedValue(undefined);

    await service.uploadToCloud('user-1', 'backup-1', 'gcp', 'path/file.enc');

    expect(backupRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'backup-1', userId: 'user-1', isActive: true }
    });
    expect(cloudProviderMock.upload).toHaveBeenCalledWith({
      userId: 'user-1',
      backupId: 'backup-1',
      data: undefined,
      cloudPath: 'path/file.enc'
    });
  });

  it('throws on uploadToCloud when backup is missing', async () => {
    const service = new BackupService();
    backupRepository.findOne.mockResolvedValue(null);

    await expect(service.uploadToCloud('user-1', 'missing', 'gcp', '/path')).rejects.toThrow('Backup not found');
  });

  it('throws when cloud download backup is missing', async () => {
    const service = new BackupService();
    backupRepository.findOne.mockResolvedValue(null);

    await expect(service.downloadFromCloud('user-1', 'missing')).rejects.toThrow('Backup not found');
  });

  it('rejects cloud download when backup is not cloud-backed', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      userId: 'user-1',
      cloudProvider: null,
      cloudPath: null,
      isActive: true
    });

    await expect(service.downloadFromCloud('user-1', 'backup-1')).rejects.toThrow(
      'Backup is not stored in cloud'
    );
  });

  it('returns encrypted data when cloud download succeeds', async () => {
    const service = new BackupService();

    backupRepository.findOne.mockResolvedValue({
      id: 'backup-1',
      userId: 'user-1',
      cloudProvider: 'gcp',
      cloudPath: '/b.enc',
      data: 'encrypted-payload',
      isActive: true
    });

    const result = await service.downloadFromCloud('user-1', 'backup-1');

    expect(result).toBe('encrypted-cloud-payload');
    expect(cloudProviderMock.download).toHaveBeenCalledWith({
      userId: 'user-1',
      backupId: 'backup-1',
      cloudPath: '/b.enc'
    });
  });

  it('returns number of cleaned expired backups', async () => {
    const service = new BackupService();

    backupRepository.find.mockResolvedValue([
      { id: 'b1', userId: 'user-1' },
      { id: 'b2', userId: 'user-1' }
    ]);

    const deleteSpy = jest.spyOn(service, 'deleteBackup')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const count = await service.cleanupExpiredBackups('user-1');

    expect(count).toBe(2);
    expect(deleteSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps cleanup running and logs when one delete fails', async () => {
    const service = new BackupService();

    backupRepository.find.mockResolvedValue([
      { id: 'b1', userId: 'user-1' },
      { id: 'b2', userId: 'user-1' }
    ]);

    const deleteSpy = jest.spyOn(service, 'deleteBackup')
      .mockRejectedValueOnce(new Error('cannot delete b1'))
      .mockResolvedValueOnce(undefined);

    const count = await service.cleanupExpiredBackups('user-1');

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(loggerError).toHaveBeenCalledWith('Failed to delete expired backup', {
      backupId: 'b1',
      error: 'cannot delete b1'
    });
    expect(count).toBe(1);
  });

  it('returns backup stats summary', async () => {
    const service = new BackupService();

    backupRepository.find.mockResolvedValue([
      { size: 10, type: 'cloud', isExpired: () => false },
      { size: 20, type: 'local', isExpired: () => true }
    ]);

    const result = await service.getBackupStats('user-1');

    expect(result).toEqual({
      total: 2,
      totalSize: 30,
      cloudBackups: 1,
      localBackups: 1,
      expiredBackups: 1
    });
  });
});
