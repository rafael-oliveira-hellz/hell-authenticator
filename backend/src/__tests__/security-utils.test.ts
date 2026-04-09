import { getTrustProxyConfig, sanitizeHeaders } from '../utils/security';

describe('security utils', () => {
  it('redacts sensitive headers', () => {
    const sanitized = sanitizeHeaders({
      authorization: 'Bearer token',
      cookie: 'session=abc',
      'x-api-key': 'secret',
      host: 'localhost:3000'
    });

    expect(sanitized).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'x-api-key': '[REDACTED]',
      host: 'localhost:3000'
    });
  });

  it('rejects TRUST_PROXY=true in production', () => {
    expect(() => getTrustProxyConfig('production', 'true')).toThrow(
      'TRUST_PROXY=true is not allowed in production. Use TRUST_PROXY=apprunner or explicit proxy IP/CIDR list.'
    );
  });

  it('accepts explicit trusted proxy list', () => {
    expect(getTrustProxyConfig('production', '10.0.0.1, 10.0.0.2')).toEqual([
      '10.0.0.1',
      '10.0.0.2'
    ]);
  });

  it('accepts apprunner mode in production', () => {
    expect(getTrustProxyConfig('production', 'apprunner')).toBe(true);
    expect(getTrustProxyConfig('production', 'aws-apprunner')).toBe(true);
  });
});
