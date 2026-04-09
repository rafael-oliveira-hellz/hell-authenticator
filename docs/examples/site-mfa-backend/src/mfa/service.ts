import crypto from 'crypto';
import { TotpAlgorithm } from '../types';
import { buildOtpauthUrl, verifyTotp } from './totp';

export function generateBase32Secret(length: number = 32): string {
  // Gera Base32 (A-Z2-7), sem padding
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 4) return '****';
  return `${'*'.repeat(secret.length - 4)}${secret.slice(-4)}`;
}

export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(10).toString('base64url').slice(0, 10).toUpperCase());
  }
  return codes;
}

export function hashRecovery(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function validateTotpAndAntiReplay(
  code: string,
  secretBase32: string,
  algorithm: TotpAlgorithm,
  digits: 6 | 8,
  period: number,
  lastCounter?: number
): { ok: boolean; counter?: number } {
  const { valid, counter } = verifyTotp(code, { secretBase32, algorithm, digits, period }, 1);
  if (!valid) return { ok: false };
  if (typeof counter === 'number' && typeof lastCounter === 'number' && counter === lastCounter) {
    return { ok: false };
  }
  return { ok: true, counter };
}

export function buildSetupPayload(email: string, secretBase32: string, algorithm: TotpAlgorithm, digits: 6 | 8, period: number) {
  const issuer = 'SeuSite';
  const label = email;
  return {
    otpauthUrl: buildOtpauthUrl(label, issuer, secretBase32, algorithm, digits, period),
    secretMasked: maskSecret(secretBase32),
  };
}


