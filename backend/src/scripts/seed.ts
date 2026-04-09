import { hash } from 'bcrypt';
import { createHash } from 'crypto';
import { AppDataSource, closeDatabase, initializeDatabase } from '../config/database';
import { Account } from '../models/Account';
import { Backup } from '../models/Backup';
import { User } from '../models/User';
import { EncryptionService } from '../services/EncryptionService';

type SeedAccountInput = {
  name: string;
  issuer: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
  color: string;
  icon: string;
  metadata: {
    category: string;
    notes: string;
  };
};

type SeedConfig = {
  email: string;
  password: string;
  name: string;
};

const DEFAULT_ACCOUNTS: SeedAccountInput[] = [
  {
    name: 'dev@hellauth.com',
    issuer: 'GitHub',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    color: '#24292E',
    icon: 'github',
    metadata: {
      category: 'development',
      notes: 'Conta demo para validar exibicao de TOTP.'
    }
  },
  {
    name: 'security@hellauth.com',
    issuer: 'Google',
    secret: 'KRSXG5DSNFXGOIDB',
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
    color: '#4285F4',
    icon: 'google',
    metadata: {
      category: 'workspace',
      notes: 'Conta demo com algoritmo diferente para testes.'
    }
  }
];

const DEFAULT_USER_PREFERENCES: User['preferences'] = {
  theme: 'auto',
  language: 'pt-BR',
  notifications: {
    push: true,
    email: true,
    sms: false,
    newAccount: true,
    backupReminder: true,
    securityAlert: true
  },
  security: {
    biometricEnabled: false,
    pinEnabled: false,
    pinLength: 6,
    autoLock: 5,
    sessionTimeout: 30
  },
  backup: {
    autoBackup: true,
    backupFrequency: 7,
    cloudProvider: 'gcp',
    encryptionEnabled: true,
    retentionDays: 30
  }
};

export const getSeedConfig = (): SeedConfig => ({
  email: process.env.SEED_USER_EMAIL || 'demo@hellauth.com',
  password: process.env.SEED_USER_PASSWORD || 'Demo@123456',
  name: process.env.SEED_USER_NAME || 'Hell Auth Demo'
});

export const buildSeedAccounts = (
  encryptionService = new EncryptionService()
): Array<Pick<Account, 'name' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period' | 'icon' | 'color' | 'metadata' | 'isActive'>> =>
  DEFAULT_ACCOUNTS.map((account) => {
    const encrypted = encryptionService.encryptAccountData({
      secret: account.secret,
      metadata: account.metadata
    });

    return {
      name: account.name,
      issuer: account.issuer,
      secret: encrypted.secret,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      icon: account.icon,
      color: account.color,
      metadata: encrypted.metadata ?? null,
      isActive: true
    };
  });

export const buildBackupPayload = (
  user: Pick<User, 'email' | 'name'>,
  accounts: Array<Pick<Account, 'name' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period' | 'icon' | 'color' | 'metadata' | 'isActive'>>,
  encryptionService = new EncryptionService()
): {
  data: string;
  checksum: string;
  size: number;
} => {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    user,
    accounts
  };

  const encryptedData = encryptionService.encryptBackupData(snapshot);

  return {
    data: encryptedData,
    checksum: createHash('sha256').update(encryptedData).digest('hex'),
    size: Buffer.byteLength(encryptedData, 'utf8')
  };
};

export async function main() {
  const encryptionService = new EncryptionService();
  const userRepository = AppDataSource.getRepository(User);
  const accountRepository = AppDataSource.getRepository(Account);
  const backupRepository = AppDataSource.getRepository(Backup);
  const seedConfig = getSeedConfig();

  await initializeDatabase();

  try {
    const passwordHash = await hash(seedConfig.password, 12);

    let user = await userRepository.findOne({
      where: { email: seedConfig.email.toLowerCase() }
    });

    if (!user) {
      user = userRepository.create({
        email: seedConfig.email.toLowerCase(),
        name: seedConfig.name,
        passwordHash,
        isActive: true,
        isPremium: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        preferences: DEFAULT_USER_PREFERENCES
      });
    } else {
      user.name = seedConfig.name;
      user.passwordHash = passwordHash;
      user.isActive = true;
      user.isPremium = true;
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.preferences = DEFAULT_USER_PREFERENCES;
    }

    user = await userRepository.save(user);

    const seededAccounts = buildSeedAccounts(encryptionService);
    const persistedAccounts: Account[] = [];

    for (const seededAccount of seededAccounts) {
      let account = await accountRepository.findOne({
        where: {
          userId: user.id,
          name: seededAccount.name
        }
      });

      if (!account) {
        account = accountRepository.create({
          userId: user.id
        });
      }

      account.userId = user.id;
      account.name = seededAccount.name;
      account.issuer = seededAccount.issuer;
      account.secret = seededAccount.secret;
      account.algorithm = seededAccount.algorithm;
      account.digits = seededAccount.digits;
      account.period = seededAccount.period;
      account.icon = seededAccount.icon;
      account.color = seededAccount.color;
      account.metadata = seededAccount.metadata;
      account.isActive = seededAccount.isActive;

      persistedAccounts.push(await accountRepository.save(account));
    }

    const backupPayload = buildBackupPayload(
      {
        email: user.email,
        name: user.name
      },
      persistedAccounts,
      encryptionService
    );

    let backup = await backupRepository.findOne({
      where: {
        userId: user.id,
        description: 'Demo backup seed'
      },
      order: {
        createdAt: 'DESC'
      }
    });

    if (!backup) {
      backup = backupRepository.create({
        userId: user.id,
        version: '1.0.0',
        description: 'Demo backup seed',
        type: 'manual',
        cloudProvider: null,
        cloudPath: null,
        isEncrypted: true,
        isActive: true
      });
    }

    backup.data = backupPayload.data;
    backup.version = '1.0.0';
    backup.description = 'Demo backup seed';
    backup.type = 'manual';
    backup.cloudProvider = null;
    backup.cloudPath = null;
    backup.size = backupPayload.size;
    backup.checksum = backupPayload.checksum;
    backup.isEncrypted = true;
    backup.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    backup.isActive = true;

    await backupRepository.save(backup);

    console.log('Seed completed successfully.');
    console.log(`User: ${user.email}`);
    console.log(`Password: ${seedConfig.password}`);
    console.log(`Accounts seeded: ${persistedAccounts.length}`);
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to run seed:', error);
    process.exit(1);
  });
}
