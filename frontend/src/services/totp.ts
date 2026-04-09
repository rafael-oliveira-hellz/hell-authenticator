/* eslint-disable no-bitwise */

import {
  TOTPAlgorithm,
  TOTPDigits,
  TOTPPeriod,
  TOTPCode,
  Account,
} from '@/types';
import CryptoJS from 'crypto-js';

class TOTPService {
  private readonly defaultAlgorithm: TOTPAlgorithm = 'SHA1';
  private readonly defaultDigits: TOTPDigits = 6;
  private readonly defaultPeriod: TOTPPeriod = 30;

  generateTOTP(account: Account): TOTPCode {
    const secret = account.secret;
    const algorithm = account.algorithm || this.defaultAlgorithm;
    const digits = account.digits || this.defaultDigits;
    const period = account.period || this.defaultPeriod;

    const counter = Math.floor(Date.now() / 1000 / period);
    const code = this.generateHOTP(secret, counter, algorithm, digits);
    const remainingTime = period - (Math.floor(Date.now() / 1000) % period);
    const expiresAt = new Date(Date.now() + remainingTime * 1000);

    return {
      code,
      remainingTime,
      period,
      expiresAt,
    };
  }

  private generateHOTP(secret: string, counter: number, algorithm: TOTPAlgorithm, digits: TOTPDigits): string {
    const counterBuffer = this.intToBytes(counter);
    const hmac = this.generateHMAC(secret, counterBuffer, algorithm);
    return this.truncate(hmac, digits);
  }

  private generateHMAC(secret: string, data: number[], algorithm: TOTPAlgorithm): number[] {
    const key = this.base32Decode(secret);
    const payload = CryptoJS.lib.WordArray.create(data);

    let hmac: CryptoJS.lib.WordArray;
    switch (algorithm) {
      case 'SHA256':
        hmac = CryptoJS.HmacSHA256(payload, key);
        break;
      case 'SHA512':
        hmac = CryptoJS.HmacSHA512(payload, key);
        break;
      case 'SHA1':
      default:
        hmac = CryptoJS.HmacSHA1(payload, key);
        break;
    }

    const words = hmac.words;
    const bytes: number[] = [];

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      bytes.push((word >>> 24) & 0xff);
      bytes.push((word >>> 16) & 0xff);
      bytes.push((word >>> 8) & 0xff);
      bytes.push(word & 0xff);
    }

    return bytes;
  }

  private truncate(hmac: number[], digits: TOTPDigits): string {
    const offset = hmac[hmac.length - 1] & 0x0f;

    const code = ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff);

    const modulo = Math.pow(10, digits);
    const result = (code % modulo).toString();

    return result.padStart(digits, '0');
  }

  private intToBytes(value: number): number[] {
    const bytes = new Array(8);
    for (let i = 7; i >= 0; i -= 1) {
      bytes[i] = value & 0xff;
      value = value >>> 8;
    }
    return bytes;
  }

  private base32Decode(input: string): CryptoJS.lib.WordArray {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const padding = '=';

    let output = '';
    let bits = 0;
    let buffer = 0;

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i].toUpperCase();
      if (char === padding) break;

      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      buffer = (buffer << 5) | index;
      bits += 5;

      while (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode((buffer >>> bits) & 0xff);
      }
    }

    const words: number[] = [];
    for (let i = 0; i < output.length; i += 4) {
      let word = 0;
      for (let j = 0; j < 4 && i + j < output.length; j += 1) {
        word = (word << 8) | output.charCodeAt(i + j);
      }
      words.push(word);
    }

    return CryptoJS.lib.WordArray.create(words, output.length);
  }

  validateTOTP(account: Account, code: string, window: number = 1): boolean {
    const currentCode = this.generateTOTP(account);

    if (currentCode.code === code) {
      return true;
    }

    for (let i = 1; i <= window; i += 1) {
      const pastCounter = Math.floor(Date.now() / 1000 / currentCode.period) - i;
      const futureCounter = Math.floor(Date.now() / 1000 / currentCode.period) + i;

      const pastCode = this.generateHOTP(account.secret, pastCounter, account.algorithm, account.digits);
      const futureCode = this.generateHOTP(account.secret, futureCounter, account.algorithm, account.digits);

      if (pastCode === code || futureCode === code) {
        return true;
      }
    }

    return false;
  }

  generateQRCodeURI(account: Account): string {
    const label = account.issuer ? `${account.issuer}:${account.name}` : account.name;
    const parameters = new URLSearchParams({
      secret: account.secret,
      issuer: account.issuer || '',
      algorithm: account.algorithm || this.defaultAlgorithm,
      digits: account.digits?.toString() || this.defaultDigits.toString(),
      period: account.period?.toString() || this.defaultPeriod.toString(),
    });

    return `otpauth://totp/${encodeURIComponent(label)}?${parameters.toString()}`;
  }

  parseQRCodeURI(uri: string): {
    type: 'totp' | 'hotp';
    label: string;
    issuer?: string;
    secret: string;
    algorithm?: TOTPAlgorithm;
    digits?: TOTPDigits;
    period?: TOTPPeriod;
    counter?: number;
  } | null {
    try {
      if (!uri.startsWith('otpauth://')) {
        return null;
      }

      const payload = uri.slice('otpauth://'.length);
      const firstSlash = payload.indexOf('/');
      if (firstSlash <= 0) {
        return null;
      }

      const type = payload.slice(0, firstSlash) as 'totp' | 'hotp';
      if (type !== 'totp' && type !== 'hotp') {
        return null;
      }

      const pathAndQuery = payload.slice(firstSlash + 1);
      const queryIndex = pathAndQuery.indexOf('?');
      const encodedLabel = queryIndex >= 0 ? pathAndQuery.slice(0, queryIndex) : pathAndQuery;
      const queryString = queryIndex >= 0 ? pathAndQuery.slice(queryIndex + 1) : '';

      const rawLabel = decodeURIComponent(encodedLabel).replace(/^\/+/, '');
      const separatorIndex = rawLabel.indexOf(':');
      const label = separatorIndex >= 0 ? rawLabel.slice(separatorIndex + 1) : rawLabel;
      const issuerFromLabel = separatorIndex >= 0 ? rawLabel.slice(0, separatorIndex) : undefined;

      const params: Record<string, string> = {};
      if (queryString) {
        for (const pair of queryString.split('&')) {
          if (!pair) {
            continue;
          }

          const [rawKey, rawValue = ''] = pair.split('=');
          const key = decodeURIComponent(rawKey || '').trim();
          if (!key) {
            continue;
          }

          params[key] = decodeURIComponent(rawValue || '');
        }
      }

      const secret = params.secret;
      if (!secret) {
        return null;
      }

      const issuer = params.issuer || issuerFromLabel || undefined;
      const algorithm = (params.algorithm as TOTPAlgorithm) || this.defaultAlgorithm;
      const digits = parseInt(params.digits || this.defaultDigits.toString(), 10) as TOTPDigits;
      const period = parseInt(params.period || this.defaultPeriod.toString(), 10) as TOTPPeriod;
      const counter = params.counter ? parseInt(params.counter, 10) : undefined;

      return {
        type,
        label,
        issuer,
        secret,
        algorithm,
        digits,
        period,
        counter,
      };
    } catch {
      return null;
    }
  }

  generateMultipleTOTP(accounts: Account[]): Map<string, TOTPCode> {
    const codes = new Map<string, TOTPCode>();

    for (const account of accounts) {
      codes.set(account.id, this.generateTOTP(account));
    }

    return codes;
  }

  getTimeRemaining(period: TOTPPeriod): number {
    return period - (Math.floor(Date.now() / 1000) % period);
  }

  getProgress(period: TOTPPeriod): number {
    const remaining = this.getTimeRemaining(period);
    return ((period - remaining) / period) * 100;
  }

  isCodeExpiringSoon(period: TOTPPeriod, threshold: number = 5): boolean {
    const remaining = this.getTimeRemaining(period);
    return remaining <= threshold;
  }

  generateTestCode(secret: string, algorithm: TOTPAlgorithm = 'SHA1', digits: TOTPDigits = 6): string {
    const counter = Math.floor(Date.now() / 1000 / 30);
    return this.generateHOTP(secret, counter, algorithm, digits);
  }

  validateSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret.toUpperCase());
  }

  sanitizeSecret(secret: string): string {
    return secret.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  }
}

export const totpService = new TOTPService();
export default totpService;
