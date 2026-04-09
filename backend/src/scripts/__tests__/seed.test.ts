describe('seed script helpers', () => {
  const validEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const loadModules = async () => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = validEncryptionKey;

    const seedModule = await import('../seed');
    const servicesModule = await import('../../services/EncryptionService');

    return {
      ...seedModule,
      EncryptionService: servicesModule.EncryptionService
    };
  };

  it('returns default seed config when env vars are absent', async () => {
    delete process.env.SEED_USER_EMAIL;
    delete process.env.SEED_USER_PASSWORD;
    delete process.env.SEED_USER_NAME;

    const { getSeedConfig } = await loadModules();

    expect(getSeedConfig()).toEqual({
      email: 'demo@hellauth.com',
      password: 'Demo@123456',
      name: 'Hell Auth Demo'
    });
  });

  it('builds encrypted accounts for the seed fixtures', async () => {
    const { buildSeedAccounts, EncryptionService } = await loadModules();
    const encryptionService = new EncryptionService();
    const accounts = buildSeedAccounts(encryptionService);
    const decrypted = encryptionService.decryptAccountData({
      secret: accounts[0].secret,
      metadata: accounts[0].metadata ?? undefined
    });

    expect(accounts).toHaveLength(2);
    expect(accounts[0].issuer).toBe('GitHub');
    expect(decrypted.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(decrypted.metadata).toEqual({
      category: 'development',
      notes: 'Conta demo para validar exibicao de TOTP.'
    });
  });

  it('builds an encrypted backup payload with checksum and size', async () => {
    const { buildBackupPayload, buildSeedAccounts, EncryptionService } = await loadModules();
    const encryptionService = new EncryptionService();
    const accounts = buildSeedAccounts(encryptionService);
    const payload = buildBackupPayload(
      {
        email: 'demo@hellauth.com',
        name: 'Hell Auth Demo'
      },
      accounts,
      encryptionService
    );
    const decrypted = encryptionService.decryptBackupData(payload.data);

    expect(payload.checksum).toHaveLength(64);
    expect(payload.size).toBeGreaterThan(0);
    expect(Array.isArray(decrypted.accounts)).toBe(true);
    expect((decrypted.accounts as Array<{ name: string }>)[0].name).toBe('dev@hellauth.com');
  });
});
