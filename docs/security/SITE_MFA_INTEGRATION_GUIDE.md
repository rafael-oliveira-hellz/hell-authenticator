### Guia de Integração MFA (TOTP) para o Backend do Seu Site

Este guia descreve endpoints e implementações em Fastify/TypeScript para adicionar MFA baseado em TOTP ao backend do seu site. O Hell Authenticator (este app) escaneia o QR `otpauth://` e gera o código; a verificação é feita aqui (no backend do site).

## Conceitos
- Secret TOTP: Base32, armazenado criptografado em repouso.
- Tolerância de janela: aceite do período atual e adjacentes (ex.: ±1).
- Prevenção de reuso: não aceitar o mesmo contador duas vezes.
- Recovery codes: hash em repouso, uso one-time, exibidos apenas na ativação.

## Endpoints

1) POST /mfa/setup
- Requer usuário autenticado por senha.
- Gera secret, persiste estado "MFA_PENDING" e retorna `otpauthUrl` para o site exibir o QR.

Resposta:
```json
{ "otpauthUrl": "otpauth://totp/SeuSite:email@dominio?secret=...&issuer=SeuSite&digits=6&period=30&algorithm=SHA1", "secretMasked": "****ABCD" }
```

2) POST /mfa/verify-setup { code }
- Valida TOTP com janela (±1), ativa MFA e gera recovery codes (hash), retorna lista para exibição única.

3) POST /auth/login { email, password }
- Se MFA ativo: retorna `{ status: "MFA_REQUIRED", challengeId }` (sem emitir token final).
- Se não: retorna `{ user, tokens }`.

4) POST /mfa/verify-login { challengeId, code | recoveryCode }
- Valida TOTP (ou recovery), promove login e emite `{ user, tokens }`.

5) POST /mfa/disable { password, code }
- Desativa MFA com confirmação forte.

## Exemplo (Fastify + TypeScript)

Instalação sugerida:
```bash
npm i fastify jsonwebtoken bcrypt speakeasy zod
```

### Utilitários de TOTP
```ts
// src/mfa/totp.ts
import speakeasy from 'speakeasy';

export type TOTPAlgorithm = 'sha1' | 'sha256' | 'sha512';

export interface TOTPOptions {
  secretBase32: string;
  algorithm?: TOTPAlgorithm;
  digits?: 6 | 8;
  period?: number; // 15-60
}

const DEFAULTS = { algorithm: 'sha1' as const, digits: 6 as const, period: 30 };

export function verifyTOTP(code: string, opts: TOTPOptions, window = 1): { valid: boolean; delta?: number; counter?: number } {
  const options = { ...DEFAULTS, ...opts };
  const result = speakeasy.totp.verifyDelta({
    secret: options.secretBase32,
    encoding: 'base32',
    token: code,
    window,
    digits: options.digits,
    step: options.period,
    algorithm: options.algorithm.toUpperCase() as any,
  });
  if (result && typeof result.delta === 'number') {
    const counter = Math.floor(Date.now() / 1000 / (options.period || DEFAULTS.period));
    return { valid: true, delta: result.delta, counter };
  }
  return { valid: false };
}

export function buildOtpauthUrl(label: string, issuer: string, secretBase32: string, algorithm: TOTPAlgorithm = 'sha1', digits: 6 | 8 = 6, period = 30) {
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: algorithm.toUpperCase(), digits: String(digits), period: String(period) });
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?${params.toString()}`;
}
```

### Modelo do Usuário (campos de MFA)
```ts
// src/users/User.ts
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  mfaEnabled: boolean;
  mfaSecretEnc?: string; // secret TOTP cifrado
  mfaAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  mfaDigits?: 6 | 8;
  mfaPeriod?: number; // 15-60
  mfaLastCounter?: number; // prevenção de reuso
  mfaRecoveryHash?: string[]; // hashes
  mfaStatus?: 'NONE' | 'PENDING' | 'ENABLED';
}
```

### Serviço de MFA
```ts
// src/mfa/service.ts
import { verifyTOTP, buildOtpauthUrl } from './totp';
import crypto from 'crypto';

export function maskSecret(secret: string) {
  return secret.length <= 4 ? '****' : `${'*'.repeat(secret.length - 4)}${secret.slice(-4)}`;
}

export function hashRecovery(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateRecoveryCodes(n = 8) {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = crypto.randomBytes(10).toString('base64url').slice(0, 10).toUpperCase();
    codes.push(raw);
  }
  return codes;
}

export function validateAndPreventReuse(user: any, code: string, secretBase32: string, algorithm: any, digits: any, period: any) {
  const { valid, counter } = verifyTOTP(code, { secretBase32, algorithm, digits, period }, 1);
  if (!valid) return { ok: false };
  if (typeof counter === 'number' && typeof user.mfaLastCounter === 'number' && counter === user.mfaLastCounter) {
    return { ok: false }; // mesmo período
  }
  return { ok: true, counter };
}

export function buildSetupPayload(user: any, secretBase32: string) {
  const issuer = 'SeuSite';
  const label = user.email;
  const otpauthUrl = buildOtpauthUrl(label, issuer, secretBase32, user.mfaAlgorithm || 'sha1', user.mfaDigits || 6, user.mfaPeriod || 30);
  return { otpauthUrl, secretMasked: maskSecret(secretBase32) };
}
```

### Rotas Fastify (exemplo)
```ts
// src/routes/mfa.ts
import { FastifyInstance } from 'fastify';
import { buildSetupPayload, generateRecoveryCodes, hashRecovery, validateAndPreventReuse } from '../mfa/service';
import { decrypt, encrypt } from '../security/crypto'; // implemente AES-256-GCM aqui

export default async function (app: FastifyInstance) {
  // POST /mfa/setup
  app.post('/mfa/setup', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.db.users.findById((req as any).user.id);
    if (!user) return reply.code(404).send({ error: 'User not found' });

    // gerar secret Base32
    const secretBase32 = app.mfa.secrets.generate(); // implemente gerador Base32 seguro
    user.mfaSecretEnc = encrypt(secretBase32);
    user.mfaAlgorithm = 'sha1';
    user.mfaDigits = 6;
    user.mfaPeriod = 30;
    user.mfaStatus = 'PENDING';
    await app.db.users.save(user);

    return reply.send(buildSetupPayload(user, secretBase32));
  });

  // POST /mfa/verify-setup { code }
  app.post('/mfa/verify-setup', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { code } = (req.body as any);
    const user = await app.db.users.findById((req as any).user.id);
    if (!user || !user.mfaSecretEnc) return reply.code(400).send({ error: 'MFA not pending' });

    const secretBase32 = decrypt(user.mfaSecretEnc);
    const res = validateAndPreventReuse(user, code, secretBase32, user.mfaAlgorithm, user.mfaDigits, user.mfaPeriod);
    if (!res.ok) return reply.code(400).send({ error: 'Invalid code' });

    user.mfaEnabled = true;
    user.mfaStatus = 'ENABLED';
    user.mfaLastCounter = res.counter;

    const rawCodes = generateRecoveryCodes(8);
    user.mfaRecoveryHash = rawCodes.map(hashRecovery);

    await app.db.users.save(user);
    return reply.send({ recoveryCodes: rawCodes });
  });

  // POST /auth/login { email, password }
  app.post('/auth/login', async (req, reply) => {
    const { email, password } = (req.body as any);
    const user = await app.db.users.findByEmail(email);
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
    const ok = await app.security.verifyPassword(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    if (user.mfaEnabled) {
      const challengeId = await app.mfa.challenges.create(user.id); // guarde userId + expiração curta
      return reply.send({ status: 'MFA_REQUIRED', challengeId });
    }

    const tokens = app.security.issueTokens(user.id);
    return reply.send({ user: app.users.toResponse(user), tokens });
  });

  // POST /mfa/verify-login { challengeId, code | recoveryCode }
  app.post('/mfa/verify-login', async (req, reply) => {
    const { challengeId, code, recoveryCode } = (req.body as any);
    const challenge = await app.mfa.challenges.get(challengeId);
    if (!challenge) return reply.code(400).send({ error: 'Invalid challenge' });
    const user = await app.db.users.findById(challenge.userId);
    if (!user || !user.mfaSecretEnc) return reply.code(400).send({ error: 'MFA not enabled' });

    if (recoveryCode) {
      const hash = app.mfa.hashRecovery(recoveryCode);
      const idx = user.mfaRecoveryHash?.indexOf(hash) ?? -1;
      if (idx === -1) return reply.code(400).send({ error: 'Invalid recovery code' });
      user.mfaRecoveryHash!.splice(idx, 1);
      await app.db.users.save(user);
    } else if (code) {
      const secretBase32 = decrypt(user.mfaSecretEnc);
      const res = validateAndPreventReuse(user, code, secretBase32, user.mfaAlgorithm, user.mfaDigits, user.mfaPeriod);
      if (!res.ok) return reply.code(400).send({ error: 'Invalid code' });
      user.mfaLastCounter = res.counter;
      await app.db.users.save(user);
    } else {
      return reply.code(400).send({ error: 'Code or recoveryCode required' });
    }

    await app.mfa.challenges.consume(challengeId);
    const tokens = app.security.issueTokens(user.id);
    return reply.send({ user: app.users.toResponse(user), tokens });
  });
}
```

### Notas de Segurança
- Criptografe `mfaSecretEnc` (AES-256-GCM) e nunca logue secrets/códigos.
- Rate limiting e lockout progressivo em `/mfa/verify-*`.
- Expiração curta para `challengeId` (ex.: 2–5 minutos) e vínculo a IP/device quando possível.
- Auditoria: ativação/desativação, verificações, falhas, regenerações de recovery codes.

### Testes de Aceitação (resumo)
- Ativação: setup → verify-setup (válido/inválido) → recovery codes exibidos uma única vez.
- Login com MFA: login (MFA_REQUIRED) → verify-login (válido/inválido, reuso bloqueado).
- Recovery: verify-login com recovery code válido (one-time).

Este guia é independente do backend do app autenticador. Ele cobre o backend do seu site que consumirá os códigos TOTP gerados no app.
