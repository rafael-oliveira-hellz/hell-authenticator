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

const encryptionMock = {
  encryptAccountData: jest.fn(),
  decryptAccountData: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

jest.mock('../EncryptionService', () => ({
  EncryptionService: jest.fn().mockImplementation(() => encryptionMock)
}));

import { AppDataSource } from '../../config/database';
import { AccountService } from '../AccountService';

describe('AccountService', () => {
  const accountRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn()
  };

  const userRepository = {
    findOne: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService() {
    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(accountRepository)
      .mockReturnValueOnce(userRepository);

    return new AccountService();
  }

  it('lists accounts ordered and mapped to response', async () => {
    const service = createService();
    const createdAt = new Date();
    const updatedAt = new Date();

    accountRepository.find.mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Github',
        issuer: 'GitHub',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        isActive: true,
        usageCount: 5,
        lastUsedAt: createdAt,
        icon: null,
        color: null,
        metadata: 'enc-meta',
        createdAt,
        updatedAt
      }
    ]);

    encryptionMock.decrypt.mockReturnValue('{"category":"work"}');

    const result = await service.listAccounts('user-1');

    expect(accountRepository.find).toHaveBeenCalledWith({
      where: { userId: 'user-1', isActive: true },
      order: { name: 'ASC' }
    });
    expect(result[0].metadata).toEqual({ category: 'work' });
  });

  it('throws when getAccount does not find account', async () => {
    const service = createService();
    accountRepository.findOne.mockResolvedValue(null);

    await expect(service.getAccount('user-1', 'missing')).rejects.toThrow('Account not found');
  });

  it('rejects createAccount when user does not exist', async () => {
    const service = createService();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createAccount('user-1', {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      })
    ).rejects.toThrow('User not found');
  });

  it('rejects createAccount with period outside allowed enum', async () => {
    const service = createService();

    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });

    await expect(
      service.createAccount('user-1', {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 20 as never
      })
    ).rejects.toThrow('Invalid period. Must be 15, 30, or 60 seconds');
  });

  it('rejects duplicate account name', async () => {
    const service = createService();

    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });
    accountRepository.findOne.mockResolvedValueOnce({ id: 'account-existing' });

    await expect(
      service.createAccount('user-1', {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      })
    ).rejects.toThrow('Account with this name already exists');
  });

  it('creates account successfully', async () => {
    const service = createService();

    userRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true });
    accountRepository.findOne.mockResolvedValue(null);

    encryptionMock.encryptAccountData.mockReturnValue({
      secret: 'enc-secret',
      metadata: undefined
    });

    const createdAt = new Date();
    const updatedAt = new Date();

    accountRepository.create.mockReturnValue({
      id: 'acc-1',
      name: 'Github',
      issuer: null,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      isActive: true,
      usageCount: 0,
      lastUsedAt: null,
      icon: null,
      color: null,
      metadata: null,
      createdAt,
      updatedAt
    });

    accountRepository.save.mockResolvedValue(undefined);

    const result = await service.createAccount('user-1', {
      name: 'Github',
      secret: 'JBSWY3DPEHPK3PXP',
      period: 30
    });

    expect(result.id).toBe('acc-1');
    expect(accountRepository.save).toHaveBeenCalledTimes(1);
  });

  it('updates account and encrypts metadata when provided', async () => {
    const service = createService();

    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Github',
      issuer: null,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      isActive: true,
      usageCount: 0,
      lastUsedAt: null,
      icon: null,
      color: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    accountRepository.findOne
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(null);

    encryptionMock.encrypt.mockReturnValue('enc-meta');
    accountRepository.save.mockResolvedValue(undefined);

    await service.updateAccount('user-1', 'acc-1', {
      name: 'Github New',
      metadata: { category: 'work' }
    });

    expect(encryptionMock.encrypt).toHaveBeenCalledWith('{"category":"work"}');
    expect(accountRepository.save).toHaveBeenCalledWith(account);
  });

  it('soft deletes account', async () => {
    const service = createService();

    const account = { id: 'acc-1', isActive: true };
    accountRepository.findOne.mockResolvedValue(account);
    accountRepository.save.mockResolvedValue(undefined);

    await service.deleteAccount('user-1', 'acc-1');

    expect(account.isActive).toBe(false);
    expect(accountRepository.save).toHaveBeenCalledWith(account);
  });

  it('increments usage counter', async () => {
    const service = createService();

    const account = {
      id: 'acc-1',
      incrementUsage: jest.fn()
    };

    accountRepository.findOne.mockResolvedValue(account);
    accountRepository.save.mockResolvedValue(undefined);

    await service.incrementUsage('user-1', 'acc-1');

    expect(account.incrementUsage).toHaveBeenCalledTimes(1);
  });

  it('returns backup data without exposing secret', async () => {
    const service = createService();

    accountRepository.findOne.mockResolvedValue({
      id: 'acc-1',
      name: 'Github',
      issuer: null,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      icon: null,
      color: null,
      metadata: null
    });

    const backupData = await service.getBackupData('user-1', 'acc-1');

    expect(backupData).toEqual({
      name: 'Github',
      issuer: undefined,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      icon: undefined,
      color: undefined,
      hasMetadata: false
    });
  });

  it('returns decrypted backup data for internal backend flow', async () => {
    const service = createService();

    accountRepository.findOne.mockResolvedValue({
      id: 'acc-1',
      name: 'Github',
      issuer: 'GitHub',
      secret: 'enc-secret',
      metadata: 'enc-meta',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      icon: null,
      color: null
    });

    encryptionMock.decryptAccountData.mockReturnValue({
      secret: 'RAWSECRET',
      metadata: { category: 'work' }
    });

    const result = await service.getDecryptedBackupData('user-1', 'acc-1');

    expect(result.secret).toBe('RAWSECRET');
    expect(result.metadata).toEqual({ category: 'work' });
  });

  it('accepts metadata object on restore and forwards to encryption layer', async () => {
    const service = createService();

    accountRepository.findOne.mockResolvedValue(null);
    encryptionMock.encryptAccountData.mockReturnValue({
      secret: 'encrypted-secret',
      metadata: 'encrypted-metadata'
    });

    const createdAt = new Date();
    const updatedAt = new Date();

    accountRepository.create.mockReturnValue({
      id: 'account-1',
      userId: 'user-1',
      name: 'Github',
      issuer: 'GitHub',
      secret: 'encrypted-secret',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      icon: undefined,
      color: undefined,
      metadata: 'encrypted-metadata',
      isActive: true,
      usageCount: 0,
      createdAt,
      updatedAt,
      lastUsedAt: undefined
    });

    accountRepository.save.mockImplementation(async (value: unknown) => value);
    encryptionMock.decrypt.mockReturnValue('{"category":"work"}');

    const metadata = { category: 'work' };

    await service.restoreFromBackup('user-1', {
      name: 'Github',
      secret: 'RAWSECRET',
      metadata
    } as never);

    expect(encryptionMock.encryptAccountData).toHaveBeenCalledWith({
      secret: 'RAWSECRET',
      metadata
    });
  });

  it('searches accounts using query builder and maps response', async () => {
    const service = createService();

    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Github',
          issuer: 'GitHub',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          isActive: true,
          usageCount: 1,
          lastUsedAt: null,
          icon: null,
          color: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])
    };

    accountRepository.createQueryBuilder.mockReturnValue(builder);

    const result = await service.searchAccounts('user-1', 'git');

    expect(builder.where).toHaveBeenCalled();
    expect(result.length).toBe(1);
  });

  it('returns account stats with most used account', async () => {
    const service = createService();

    accountRepository.find.mockResolvedValue([
      {
        id: 'a1',
        name: 'Github',
        issuer: 'GitHub',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        isActive: true,
        usageCount: 3,
        lastUsedAt: null,
        icon: null,
        color: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'a2',
        name: 'Gitlab',
        issuer: 'GitLab',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        isActive: true,
        usageCount: 10,
        lastUsedAt: null,
        icon: null,
        color: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const stats = await service.getAccountStats('user-1');

    expect(stats.total).toBe(2);
    expect(stats.totalUsage).toBe(13);
    expect(stats.mostUsed?.id).toBe('a2');
  });
});
