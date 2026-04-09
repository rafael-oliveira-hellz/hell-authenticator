jest.mock('../../config/environment', () => ({
  env: {
    ENCRYPTION: {
      key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  }
}));

import { EncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  it('generates 64-char hex key', () => {
    const key = EncryptionService.generateKey();

    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('encrypts and decrypts payload preserving value', () => {
    const service = new EncryptionService();
    const input = 'super-secret-value';

    const encrypted = service.encrypt(input);
    const decrypted = service.decrypt(encrypted);

    expect(EncryptionService.isEncrypted(encrypted)).toBe(true);
    expect(decrypted).toBe(input);
  });

  it('fails decryption when authTag is tampered', () => {
    const service = new EncryptionService();
    const encrypted = service.encrypt('sensitive');

    const [iv, tag, ciphertext] = encrypted.split(':');
    const tamperedTag = `${tag.slice(0, -1)}${tag.slice(-1) === 'a' ? 'b' : 'a'}`;

    expect(() => service.decrypt(`${iv}:${tamperedTag}:${ciphertext}`)).toThrow('Decryption failed');
  });

  it('fails decryption when ciphertext is tampered', () => {
    const service = new EncryptionService();
    const encrypted = service.encrypt('sensitive');

    const [iv, tag, ciphertext] = encrypted.split(':');
    const tamperedCiphertext = `${ciphertext.slice(0, -1)}${ciphertext.slice(-1) === 'a' ? 'b' : 'a'}`;

    expect(() => service.decrypt(`${iv}:${tag}:${tamperedCiphertext}`)).toThrow('Decryption failed');
  });

  it('returns false for non-encrypted plain string', () => {
    expect(EncryptionService.isEncrypted('plain-text')).toBe(false);
  });

  it('normalizes quoted or whitespace-padded keys', () => {
    const rawKey = '  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"\r\n';

    expect(EncryptionService.normalizeKey(rawKey)).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );
  });
});
