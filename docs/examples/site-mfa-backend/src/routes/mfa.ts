import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildSetupPayload, generateBase32Secret, generateRecoveryCodes, hashRecovery, validateTotpAndAntiReplay } from '../mfa/service.js';
import { decrypt, encrypt } from '../security/crypto.js';
import { TotpAlgorithm } from '../types.js';

const VerifySetupSchema = z.object({ code: z.string().regex(/^\d{6,8}$/) });
const VerifyLoginSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6,8}$/).optional(),
  recoveryCode: z.string().min(6).max(64).optional(),
}).refine((v) => Boolean(v.code || v.recoveryCode), { message: 'code or recoveryCode required' });

export default async function routes(app: FastifyInstance): Promise<void> {
  // POST /mfa/setup
  app.post('/mfa/setup', { preHandler: [app.authenticate] }, async (req, rep) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return rep.code(404).send({ error: 'User not found' });

    const secretBase32 = generateBase32Secret(32);
    const algorithm: TotpAlgorithm = 'sha1';
    const digits: 6 | 8 = 6;
    const period = 30;

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecretEnc: encrypt(secretBase32),
        mfaAlgorithm: algorithm,
        mfaDigits: digits,
        mfaPeriod: period,
        mfaStatus: 'PENDING',
      },
    });

    return rep.send(buildSetupPayload(user.email, secretBase32, algorithm, digits, period));
  });

  // POST /mfa/verify-setup
  app.post('/mfa/verify-setup', { preHandler: [app.authenticate] }, async (req, rep) => {
    const parsed = VerifySetupSchema.safeParse(req.body);
    if (!parsed.success) return rep.code(400).send({ error: 'Invalid body' });
    const user = await app.prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.mfaSecretEnc) return rep.code(400).send({ error: 'MFA not pending' });

    const secretBase32 = decrypt(user.mfaSecretEnc);
    const algorithm = (user.mfaAlgorithm as TotpAlgorithm) || 'sha1';
    const digits = (user.mfaDigits as 6 | 8) || 6;
    const period = user.mfaPeriod || 30;

    const res = validateTotpAndAntiReplay(parsed.data.code, secretBase32, algorithm, digits, period, user.mfaLastCounter ?? undefined);
    if (!res.ok) return rep.code(400).send({ error: 'Invalid code' });

    const rawCodes = generateRecoveryCodes(8);
    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaStatus: 'ENABLED',
        mfaLastCounter: res.counter ?? null,
        mfaRecoveryHash: rawCodes.map(hashRecovery),
      },
    });

    return rep.send({ recoveryCodes: rawCodes });
  });

  // POST /mfa/verify-login
  app.post('/mfa/verify-login', async (req, rep) => {
    const parsed = VerifyLoginSchema.safeParse(req.body);
    if (!parsed.success) return rep.code(400).send({ error: 'Invalid body' });

    const challenge = await app.prisma.mfaChallenge.findUnique({ where: { id: parsed.data.challengeId } });
    if (!challenge || challenge.expiresAt < new Date()) return rep.code(400).send({ error: 'Invalid challenge' });

    const user = await app.prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user || !user.mfaSecretEnc) return rep.code(400).send({ error: 'MFA not enabled' });

    if (parsed.data.recoveryCode) {
      const hash = hashRecovery(parsed.data.recoveryCode);
      const idx = user.mfaRecoveryHash.findIndex((h) => h === hash);
      if (idx === -1) return rep.code(400).send({ error: 'Invalid recovery code' });
      user.mfaRecoveryHash.splice(idx, 1);
      await app.prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryHash: user.mfaRecoveryHash } });
    } else if (parsed.data.code) {
      const secretBase32 = decrypt(user.mfaSecretEnc);
      const algorithm = (user.mfaAlgorithm as TotpAlgorithm) || 'sha1';
      const digits = (user.mfaDigits as 6 | 8) || 6;
      const period = user.mfaPeriod || 30;
      const res = validateTotpAndAntiReplay(parsed.data.code, secretBase32, algorithm, digits, period, user.mfaLastCounter ?? undefined);
      if (!res.ok) return rep.code(400).send({ error: 'Invalid code' });
      await app.prisma.user.update({ where: { id: user.id }, data: { mfaLastCounter: res.counter ?? null } });
    }

    await app.prisma.mfaChallenge.delete({ where: { id: parsed.data.challengeId } });
    const tokens = app.issueTokens(user.id);
    return rep.send({ user: { id: user.id, email: user.email }, tokens });
  });
}


