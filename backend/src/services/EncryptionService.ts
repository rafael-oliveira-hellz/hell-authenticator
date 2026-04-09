import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/environment';
import { AccountMetadata } from '../types';

const normalizeEncryptionKey = (value: string): string => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96 bits é o tamanho recomendado para GCM
  private readonly key: Buffer;

  constructor() {
    const key = normalizeEncryptionKey(env.ENCRYPTION.key);

    // Formato recomendado: 32 bytes em hex (64 chars)
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
      this.key = Buffer.from(key, 'hex');
      return;
    }

    // Compatibilidade legada: 32 caracteres UTF-8
    if (key.length === 32) {
      this.key = Buffer.from(key, 'utf8');
      return;
    }

    throw new Error('ENCRYPTION_KEY must be 64-char hex or 32-char UTF-8 string');
  }

  /**
   * Criptografa dados usando AES-256-GCM
   */
  encrypt(data: string): string {
    try {
      // Gerar IV (Initialization Vector)
      const iv = randomBytes(this.ivLength);
      
      // Criar cipher com AES-256-GCM
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      cipher.setAAD(Buffer.from('hell-auth', 'utf8')); // Additional Authenticated Data
      
      // Criptografar dados
      const encryptedBuffer = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      // Obter tag de autenticação
      const authTag = cipher.getAuthTag();
      
      // Combinar IV + AuthTag + Dados criptografados
      const result = [
        iv.toString('hex'),
        authTag.toString('hex'),
        encryptedBuffer.toString('hex')
      ].join(':');
      
      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Descriptografa dados usando AES-256-GCM
   */
  decrypt(encryptedData: string): string {
    try {
      // Separar IV, AuthTag e dados criptografados
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = Buffer.from(parts[2], 'hex');

      // Criar decipher
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAAD(Buffer.from('hell-auth', 'utf8')); // Additional Authenticated Data
      decipher.setAuthTag(authTag);

      // Descriptografar dados
      const decryptedBuffer = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decryptedBuffer.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gera uma chave de criptografia segura
   */
  static generateKey(): string {
    return randomBytes(32).toString('hex');
  }

  static normalizeKey(value: string): string {
    return normalizeEncryptionKey(value);
  }

  /**
   * Valida se uma string está criptografada
   */
  static isEncrypted(data: string): boolean {
    try {
      const parts = data.split(':');
      return parts.length === 3 &&
             parts[0].length === 24 &&
             parts[1].length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Criptografa dados sensíveis de uma conta
   */
  encryptAccountData(accountData: {
    secret: string;
    metadata?: AccountMetadata;
  }): {
    secret: string;
    metadata?: string;
  } {
    return {
      secret: this.encrypt(accountData.secret),
      metadata: accountData.metadata ? this.encrypt(JSON.stringify(accountData.metadata)) : undefined
    };
  }

  /**
   * Descriptografa dados sensíveis de uma conta
   */
  decryptAccountData(encryptedData: {
    secret: string;
    metadata?: string;
  }): {
    secret: string;
    metadata?: AccountMetadata;
  } {
    return {
      secret: this.decrypt(encryptedData.secret),
      metadata: encryptedData.metadata ? JSON.parse(this.decrypt(encryptedData.metadata)) : undefined
    };
  }

  /**
   * Criptografa dados de backup
   */
  encryptBackupData(backupData: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(backupData));
  }

  /**
   * Descriptografa dados de backup
   */
  decryptBackupData(encryptedData: string): Record<string, unknown> {
    return JSON.parse(this.decrypt(encryptedData));
  }
}




