import { totp } from 'otplib';
import { TotpAlgorithm } from '../types.js';

export interface TotpOptions {
  secretBase32: string;
  algorithm: TotpAlgorithm;
  digits: 6 | 8;
  period: number; // 15-60
}

export interface VerifyResult {
  valid: boolean;
  counter?: number;
}

export function verifyTotp(code: string, opts: TotpOptions, window: number): VerifyResult {
  totp.options = {
    algorithm: opts.algorithm,
    digits: opts.digits,
    step: opts.period,
  };
  const valid = totp.verify({ token: code, secret: opts.secretBase32, window });
  if (!valid) return { valid: false };
  const counter = Math.floor(Date.now() / 1000 / opts.period);
  return { valid: true, counter };
}

export function buildOtpauthUrl(label: string, issuer: string, secretBase32: string, algorithm: TotpAlgorithm, digits: 6 | 8, period: number): string {
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: algorithm.toUpperCase(),
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?${params.toString()}`;
}


