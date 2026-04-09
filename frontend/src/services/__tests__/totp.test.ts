import { Account } from '@/types';
import { totpService } from '../totp';

describe('totpService', () => {
  const baseAccount: Account = {
    id: 'acc-1',
    name: 'Github',
    issuer: 'GitHub',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    isActive: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeAll(() => {
    const runtime = globalThis as typeof globalThis & {
      crypto?: {
        getRandomValues?: (array: Uint8Array) => Uint8Array;
      };
    };

    runtime.crypto = runtime.crypto || {};
    runtime.crypto.getRandomValues = (array: Uint8Array) => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = (index * 17 + 11) % 256;
      }
      return array;
    };
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('generates TOTP code with expected shape', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const result = totpService.generateTOTP(baseAccount);

    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.period).toBe(30);
    expect(result.remainingTime).toBeGreaterThan(0);
    expect(result.remainingTime).toBeLessThanOrEqual(30);
  });

  it('validates secret format and sanitizes invalid chars', () => {
    expect(totpService.validateSecret('JBSWY3DPEHPK3PXP')).toBe(true);
    expect(totpService.validateSecret('invalid-secret')).toBe(false);
    expect(totpService.sanitizeSecret('jbsw y3dp-ehpk3pxp')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('generates a base32 secret for new manual accounts', () => {
    const secret = totpService.generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(totpService.validateSecret(secret)).toBe(true);
  });

  it('generates and parses otpauth URI', () => {
    const uri = totpService.generateQRCodeURI(baseAccount);
    const parsed = totpService.parseQRCodeURI(uri);

    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('totp');
    expect(parsed?.label).toBe('Github');
    expect(parsed?.secret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('returns null when parsing invalid URI', () => {
    expect(totpService.parseQRCodeURI('https://example.com')).toBeNull();
    expect(totpService.parseQRCodeURI('otpauth://totp/Issuer:Label')).toBeNull();
  });

  it('generates multiple codes for multiple accounts', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const map = totpService.generateMultipleTOTP([
      baseAccount,
      { ...baseAccount, id: 'acc-2', name: 'GitLab' }
    ]);

    expect(map.size).toBe(2);
    expect(map.get('acc-1')?.code).toMatch(/^\d{6}$/);
    expect(map.get('acc-2')?.code).toMatch(/^\d{6}$/);
  });

  it('computes remaining time, progress and expiring threshold', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const remaining = totpService.getTimeRemaining(30);
    const progress = totpService.getProgress(30);

    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
    expect(totpService.isCodeExpiringSoon(30, 30)).toBe(true);
  });
});
