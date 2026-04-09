import * as Keychain from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';

import { encryptionService } from '@/services/encryption';

jest.mock('react-native-keychain', () => {
  let password: string | null = null;

  return {
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    },
    getGenericPassword: jest.fn(async () => (password ? { username: 'device', password } : false)),
    setGenericPassword: jest.fn(async (_username: string, newPassword: string) => {
      password = newPassword;
      return true;
    }),
  };
});

jest.mock('react-native-encrypted-storage', () => {
  const store = new Map<string, string>();

  return {
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __clear: () => {
      store.clear();
    },
  };
});

type EncryptedStorageMock = {
  __clear: () => void;
};

describe('encryptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (EncryptedStorage as unknown as EncryptedStorageMock).__clear();
  });

  it('encrypts and decrypts with AES-GCM', async () => {
    const key = encryptionService.generateKey();
    const payload = 'secret-data';

    const encrypted = await encryptionService.encrypt(payload, key);

    expect(encrypted.isValid).toBe(true);
    expect(encrypted.encrypted).not.toBe(payload);
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();

    const decrypted = await encryptionService.decrypt(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.authTag,
      key
    );

    expect(decrypted.isValid).toBe(true);
    expect(decrypted.decrypted).toBe(payload);
  });

  it('returns invalid decrypt when ciphertext is tampered', async () => {
    const key = encryptionService.generateKey();
    const encrypted = await encryptionService.encrypt('payload', key);

    const tamperedCipher = `${encrypted.encrypted.slice(0, -2)}AA`;
    const tamperedDecrypt = await encryptionService.decrypt(
      tamperedCipher,
      encrypted.iv,
      encrypted.authTag,
      key
    );

    expect(tamperedDecrypt.isValid).toBe(false);
    expect(tamperedDecrypt.decrypted).toBe('');

    const tamperedTag = `${encrypted.authTag.slice(0, -2)}AA`;
    const tamperedTagDecrypt = await encryptionService.decrypt(
      encrypted.encrypted,
      encrypted.iv,
      tamperedTag,
      key
    );

    expect(tamperedTagDecrypt.isValid).toBe(false);
  });

  it('uses existing master key when already present', async () => {
    const getGenericPasswordMock = Keychain.getGenericPassword as jest.Mock;
    const setGenericPasswordMock = Keychain.setGenericPassword as jest.Mock;

    getGenericPasswordMock.mockResolvedValueOnce({ username: 'device', password: 'existing-key' });

    const key = await encryptionService.generateDeviceMasterKey();

    expect(key).toBe('existing-key');
    expect(setGenericPasswordMock).not.toHaveBeenCalled();
  });

  it('creates and stores master key when absent', async () => {
    const getGenericPasswordMock = Keychain.getGenericPassword as jest.Mock;
    const setGenericPasswordMock = Keychain.setGenericPassword as jest.Mock;

    getGenericPasswordMock.mockResolvedValueOnce(false);

    const key = await encryptionService.generateDeviceMasterKey();

    expect(key).toHaveLength(64);
    expect(setGenericPasswordMock).toHaveBeenCalledTimes(1);
  });

  it('stores, reads and removes secure data with device key', async () => {
    const storageKey = 'test.secure.value';

    const stored = await encryptionService.storeSecureData(storageKey, 'value-123');
    expect(stored).toBe(true);

    const value = await encryptionService.getSecureData(storageKey);
    expect(value).toBe('value-123');

    await encryptionService.removeSecureData(storageKey);
    const removed = await encryptionService.getSecureData(storageKey);
    expect(removed).toBeNull();
  });

  it('returns false on storeSecureData when encryption fails', async () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    const stored = await encryptionService.storeSecureData('k', 'v');
    expect(stored).toBe(false);

    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
  });

  it('encrypts and decrypts account payload', async () => {
    const key = encryptionService.generateKey();
    const encrypted = await encryptionService.encryptAccountData(
      {
        secret: 'MYSECRET',
        metadata: { category: 'mail', tags: ['a'] },
      },
      key
    );

    const decrypted = await encryptionService.decryptAccountData(encrypted, key);

    expect(decrypted.secret).toBe('MYSECRET');
    expect(decrypted.metadata?.category).toBe('mail');
    expect(decrypted.metadata?.tags).toEqual(['a']);
  });

  it('encrypts and decrypts backup payload', async () => {
    const key = encryptionService.generateKey();
    const payload = { ids: ['1', '2'], count: 2 };

    const encrypted = await encryptionService.encryptBackupData(payload, key);
    const decrypted = await encryptionService.decryptBackupData(encrypted, key);

    expect(decrypted).toEqual(payload);
  });

  it('throws on invalid backup payload', async () => {
    const key = encryptionService.generateKey();
    await expect(
      encryptionService.decryptBackupData('{"encrypted":"x","iv":"y","authTag":"z","isValid":true}', key)
    ).rejects.toThrow();
  });

  it('validates encrypted payload shape', () => {
    expect(encryptionService.isEncrypted('plain')).toBe(false);
    expect(
      encryptionService.isEncrypted(
        JSON.stringify({ encrypted: 'a', iv: 'b', authTag: 'c', isValid: true })
      )
    ).toBe(true);
  });

  it('hash and checksum utilities are consistent', () => {
    const data = 'abc';
    const sha1 = encryptionService.hashSHA1(data);
    const sha256 = encryptionService.hashSHA256(data);
    const sha512 = encryptionService.hashSHA512(data);

    expect(sha1).not.toEqual(sha256);
    expect(sha512).not.toEqual(sha256);

    expect(encryptionService.hashTOTP(data, 'SHA1')).toEqual(sha1);
    expect(encryptionService.hashTOTP(data, 'SHA256')).toEqual(sha256);
    expect(encryptionService.hashTOTP(data, 'SHA512')).toEqual(sha512);

    const checksum = encryptionService.generateChecksum(data);
    expect(encryptionService.verifyChecksum(data, checksum)).toBe(true);
    expect(encryptionService.verifyChecksum('other', checksum)).toBe(false);
  });

  it('hashes and verifies password with salt', () => {
    const password = 'Password123!';
    const { hash, salt } = encryptionService.hashPassword(password);

    expect(hash).toBeTruthy();
    expect(salt).toHaveLength(32);
    expect(encryptionService.verifyPassword(password, hash, salt)).toBe(true);
    expect(encryptionService.verifyPassword('wrong', hash, salt)).toBe(false);
  });

  it('sanitizes sensitive fields', () => {
    const sanitized = encryptionService.sanitizeData({
      password: 'p',
      token: 't',
      key: 'k',
      pin: '1',
      secret: 's',
      other: 'ok',
    });

    expect(sanitized).toEqual({
      password: '***',
      token: '***',
      key: '***',
      pin: '***',
      secret: '***',
      other: 'ok',
    });
  });

  it('scores password strength', () => {
    const weak = encryptionService.validatePasswordStrength('abc');
    const strong = encryptionService.validatePasswordStrength('Password123!');

    expect(weak.isValid).toBe(false);
    expect(weak.feedback.length).toBeGreaterThan(0);

    expect(strong.isValid).toBe(true);
    expect(strong.score).toBeGreaterThanOrEqual(4);
  });
});
