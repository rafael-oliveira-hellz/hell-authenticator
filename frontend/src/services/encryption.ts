import EncryptedStorage from 'react-native-encrypted-storage';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

import { AccountMetadata, DecryptionResult, EncryptionResult, TOTPAlgorithm } from '@/types';
type CryptoRuntime = {
  subtle?: {
    importKey: (...args: unknown[]) => Promise<unknown>;
    encrypt: (...args: unknown[]) => Promise<ArrayBuffer>;
    decrypt: (...args: unknown[]) => Promise<ArrayBuffer>;
  };
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

class EncryptionService {
  private readonly keySizeBytes = 32;
  private readonly gcmIvSizeBytes = 12;
  private readonly gcmTagSizeBytes = 16;
  private readonly masterKeyService = 'hell-authenticator.master-key';
  private readonly masterKeyUsername = 'device';

  private getSubtleCrypto() {
    const runtime = (globalThis as unknown as { crypto?: CryptoRuntime }).crypto;
    const subtle = runtime?.subtle;
    if (!subtle) {
      throw new Error('AES-GCM indisponivel no runtime atual');
    }
    return subtle;
  }

  private getRandomBytes(length: number): Uint8Array {
    const values = new Uint8Array(length);
    const runtime = (globalThis as unknown as { crypto?: CryptoRuntime }).crypto;
    if (!runtime?.getRandomValues) {
      throw new Error('CSPRNG indisponivel no runtime atual');
    }
    runtime.getRandomValues(values);
    return values;
  }

  private toBase64(bytes: Uint8Array): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(bytes as unknown as number[]));
  }

  private fromBase64(base64: string): Uint8Array {
    const wordArray = CryptoJS.enc.Base64.parse(base64);
    const hex = CryptoJS.enc.Hex.stringify(wordArray);
    const bytes: number[] = [];

    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }

    return new Uint8Array(bytes);
  }

  private getKeyBytesFromInput(key: string): Uint8Array {
    const normalized = key.trim();
    if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
      return this.fromBase64(
        CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(normalized))
      );
    }

    const digest = CryptoJS.SHA256(normalized);
    return this.fromBase64(CryptoJS.enc.Base64.stringify(digest));
  }

  async generateDeviceMasterKey(): Promise<string> {
    const credentials = await Keychain.getGenericPassword({ service: this.masterKeyService });
    if (credentials) {
      return credentials.password;
    }

    const key = this.generateKey();
    await Keychain.setGenericPassword(this.masterKeyUsername, key, {
      service: this.masterKeyService,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return key;
  }

  generateKey(): string {
    return CryptoJS.lib.WordArray.random(this.keySizeBytes).toString(CryptoJS.enc.Hex);
  }

  async encrypt(data: string, key: string): Promise<EncryptionResult> {
    try {
      const subtle = this.getSubtleCrypto();
      const iv = this.getRandomBytes(this.gcmIvSizeBytes);
      const keyBytes = this.getKeyBytesFromInput(key);
      const cryptoKey = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
      const payload = this.fromBase64(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data)));

      const encryptedBuffer = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: this.gcmTagSizeBytes * 8,
        },
        cryptoKey,
        payload
      );

      const combined = new Uint8Array(encryptedBuffer);
      const authTag = combined.slice(combined.length - this.gcmTagSizeBytes);
      const encrypted = combined.slice(0, combined.length - this.gcmTagSizeBytes);

      return {
        encrypted: this.toBase64(encrypted),
        iv: this.toBase64(iv),
        authTag: this.toBase64(authTag),
        isValid: true,
      };
    } catch {
      return {
        encrypted: '',
        iv: '',
        authTag: '',
        isValid: false,
      };
    }
  }

  async decrypt(encryptedData: string, iv: string, authTag: string, key: string): Promise<DecryptionResult> {
    try {
      const subtle = this.getSubtleCrypto();
      const keyBytes = this.getKeyBytesFromInput(key);
      const cryptoKey = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);

      const ciphertextBytes = this.fromBase64(encryptedData);
      const ivBytes = this.fromBase64(iv);
      const authTagBytes = this.fromBase64(authTag);

      const combined = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
      combined.set(ciphertextBytes, 0);
      combined.set(authTagBytes, ciphertextBytes.length);

      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes,
          tagLength: this.gcmTagSizeBytes * 8,
        },
        cryptoKey,
        combined
      );

      const plainBytes = new Uint8Array(decryptedBuffer);
      const decrypted = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(this.toBase64(plainBytes)));

      return {
        decrypted,
        isValid: true,
      };
    } catch {
      return {
        decrypted: '',
        isValid: false,
      };
    }
  }

  async encryptWithDeviceKey(data: string): Promise<EncryptionResult> {
    const key = await this.generateDeviceMasterKey();
    return this.encrypt(data, key);
  }

  async decryptWithDeviceKey(payload: { encrypted: string; iv: string; authTag: string }): Promise<DecryptionResult> {
    const key = await this.generateDeviceMasterKey();
    return this.decrypt(payload.encrypted, payload.iv, payload.authTag, key);
  }

  async storeSecureData(storageKey: string, data: string): Promise<boolean> {
    const encrypted = await this.encryptWithDeviceKey(data);
    if (!encrypted.isValid) {
      return false;
    }

    await EncryptedStorage.setItem(storageKey, JSON.stringify(encrypted));
    return true;
  }

  async getSecureData(storageKey: string): Promise<string | null> {
    const raw = await EncryptedStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as EncryptionResult;
    const decrypted = await this.decryptWithDeviceKey(payload);

    return decrypted.isValid ? decrypted.decrypted : null;
  }

  async removeSecureData(storageKey: string): Promise<void> {
    await EncryptedStorage.removeItem(storageKey);
  }

  async encryptAccountData(
    accountData: { secret: string; metadata?: AccountMetadata },
    key: string
  ): Promise<string> {
    const dataToEncrypt = {
      secret: accountData.secret,
      metadata: accountData.metadata ? JSON.stringify(accountData.metadata) : undefined,
    };

    const encrypted = await this.encrypt(JSON.stringify(dataToEncrypt), key);
    if (!encrypted.isValid) {
      throw new Error('Falha ao criptografar dados de conta');
    }

    return JSON.stringify(encrypted);
  }

  async decryptAccountData(
    encryptedData: string,
    key: string
  ): Promise<{ secret: string; metadata?: AccountMetadata }> {
    const payload = JSON.parse(encryptedData) as EncryptionResult;
    const decrypted = await this.decrypt(payload.encrypted, payload.iv, payload.authTag, key);

    if (!decrypted.isValid) {
      throw new Error('Falha ao descriptografar dados de conta');
    }

    const parsed = JSON.parse(decrypted.decrypted) as { secret: string; metadata?: string };
    return {
      secret: parsed.secret,
      metadata: parsed.metadata ? (JSON.parse(parsed.metadata) as AccountMetadata) : undefined,
    };
  }

  async encryptBackupData(backupData: Record<string, unknown>, key: string): Promise<string> {
    const encrypted = await this.encrypt(JSON.stringify(backupData), key);
    if (!encrypted.isValid) {
      throw new Error('Falha ao criptografar backup');
    }

    return JSON.stringify(encrypted);
  }

  async decryptBackupData(encryptedData: string, key: string): Promise<Record<string, unknown>> {
    const payload = JSON.parse(encryptedData) as EncryptionResult;
    const decrypted = await this.decrypt(payload.encrypted, payload.iv, payload.authTag, key);

    if (!decrypted.isValid) {
      throw new Error('Dados de backup invalidos ou corrompidos');
    }

    return JSON.parse(decrypted.decrypted) as Record<string, unknown>;
  }

  isEncrypted(data: string): boolean {
    try {
      const parsed = JSON.parse(data) as Partial<EncryptionResult>;
      return Boolean(parsed.encrypted && parsed.iv && parsed.authTag);
    } catch {
      return false;
    }
  }

  hashSHA256(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  hashSHA1(data: string): string {
    return CryptoJS.SHA1(data).toString();
  }

  hashSHA512(data: string): string {
    return CryptoJS.SHA512(data).toString();
  }

  hashTOTP(data: string, algorithm: TOTPAlgorithm): string {
    switch (algorithm) {
      case 'SHA1':
        return this.hashSHA1(data);
      case 'SHA256':
        return this.hashSHA256(data);
      case 'SHA512':
        return this.hashSHA512(data);
      default:
        return this.hashSHA1(data);
    }
  }

  generateSalt(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i += 1) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
    }

    return result;
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || this.generateSalt();
    const hash = CryptoJS.PBKDF2(password, usedSalt, {
      keySize: 256 / 32,
      iterations: 10000,
    }).toString();

    return { hash, salt: usedSalt };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  generateChecksum(data: string): string {
    return this.hashSHA256(data);
  }

  verifyChecksum(data: string, checksum: string): boolean {
    return this.generateChecksum(data) === checksum;
  }

  sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'pin'];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }

  validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Senha deve ter pelo menos 8 caracteres');
    } else {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Adicione letras maiusculas');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Adicione letras minusculas');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Adicione numeros');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Adicione caracteres especiais');
    }

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }
}

export const encryptionService = new EncryptionService();



