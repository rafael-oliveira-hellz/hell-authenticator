### site-mfa-backend

Backend de exemplo (Fastify + Prisma/PostgreSQL) com MFA (TOTP) tipado, pronto para rodar em Docker.

#### Rodando
```bash
cd docs/examples/site-mfa-backend
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Ou via Docker Compose:
```bash
docker compose up --build
```

#### Endpoints principais
- POST /auth/register { email, password }
- POST /auth/login { email, password } => { status: 'MFA_REQUIRED', challengeId } | { user, tokens }
- POST /mfa/setup (Bearer) => { otpauthUrl, secretMasked }
- POST /mfa/verify-setup (Bearer) { code } => { recoveryCodes }
- POST /mfa/verify-login { challengeId, code | recoveryCode } => { user, tokens }

Observações
- Secret TOTP cifrado (AES-256-GCM), recovery codes com hash, prevenção de reuso via `mfaLastCounter`.
- Janela de tolerância implementada no serviço TOTP.


