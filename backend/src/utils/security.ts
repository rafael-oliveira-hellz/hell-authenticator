const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization'
]);

export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function getTrustProxyConfig(nodeEnv: string, trustProxyRaw = process.env.TRUST_PROXY): boolean | string[] {
  if (!trustProxyRaw || trustProxyRaw.toLowerCase() === 'false') {
    return false;
  }

  const normalized = trustProxyRaw.toLowerCase().trim();

  if (normalized === 'apprunner' || normalized === 'aws-apprunner') {
    return true;
  }

  if (normalized === 'true') {
    if (nodeEnv === 'production') {
      throw new Error('TRUST_PROXY=true is not allowed in production. Use TRUST_PROXY=apprunner or explicit proxy IP/CIDR list.');
    }

    return true;
  }

  const trustedProxies = trustProxyRaw.split(',').map(item => item.trim()).filter(Boolean);

  if (nodeEnv === 'production' && trustedProxies.length === 0) {
    throw new Error('TRUST_PROXY must define at least one proxy IP/CIDR in production.');
  }

  return trustedProxies;
}
