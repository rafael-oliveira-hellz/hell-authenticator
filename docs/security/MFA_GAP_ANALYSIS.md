### Hell Authenticator — MFA (TOTP) Gap Analysis e Plano de Ação

Este documento mapeia, em detalhes, o que existe hoje no backend e frontend do projeto Hell Authenticator, o que falta para um fluxo de MFA/TOTP completo, e define um plano de implementação alinhado às boas práticas.

## 1) Estado Atual

- Backend (Fastify/TypeScript)
  - Login: email/senha com emissão de JWT e criação de sessão. Sem MFA/TOTP no login.
    - Referência: `backend/src/services/AuthService.ts` (método `login`), `backend/src/routes/auth.ts` (`POST /api/auth/login`).
  - TOTP no contexto do app: CRUD de contas TOTP do usuário, com secret criptografado (AES-256-GCM) e metadados.
    - Referência: `backend/src/services/AccountService.ts`, `backend/src/routes/accounts.ts`, `backend/src/services/EncryptionService.ts`.
  - Ausências relevantes ao MFA:
    - Não há endpoints de setup/confirm/verify de MFA para login (ex.: `/mfa/setup`, `/mfa/verify-setup`, `/mfa/verify-login`).
    - Não há validação de códigos TOTP no fluxo de autenticação do usuário (apenas email/senha).
    - Não há geração/gestão de códigos de recuperação.
    - Não há política de tolerância de janelas TOTP, nem proteção dedicada (rate limiting específico de MFA, antifraude para tentativas).
    - Não há marcação de MFA ativo por usuário (flag no usuário) nem journeys de ativação/desativação.

- Frontend (React Native/TypeScript)
  - Exibe códigos TOTP para contas salvas, gerando localmente a cada período.
    - Referência: `frontend/src/services/totp.ts` (Geração TOTP/HOTP, parse de otpauth URI), `frontend/src/screens/main/HomeScreen.tsx` (atualiza códigos a cada segundo).
  - Scanner de QR: tela presente, mas simulada (placeholder). Não há captura real nem parse/integração com criação de conta.
    - Referência: `frontend/src/screens/main/ScannerScreen.tsx` (simulação via `setTimeout`), `frontend/src/screens/accounts/QRScannerScreen.tsx` e `ManualEntryScreen.tsx` (ambas em desenvolvimento), `AddAccountScreen.tsx` (em desenvolvimento).
  - Ausências relevantes ao MFA:
    - Falta scanner real de QR e parsing efetivo para popular `CreateAccountData` e salvar via API.
    - Falta fluxo de onboarding de MFA do ponto de vista do “site” (o app é autenticador; quem valida o código é o backend do site do cliente). Para integração, faltam telas/fluxos de “Escanear QR do site” → “ver código gerado” → “confirmar no site”.

Observação chave: O backend atual é do app autenticador (gestão de contas TOTP), não do site que exigirá MFA no login. Portanto, a verificação do TOTP durante o login pertence ao backend do site do cliente.

## 2) O que deveria existir (Boas Práticas MFA/TOTP)

- Backend do site (não incluso hoje) — endpoints e lógica:
  - Setup do MFA por usuário:
    - `POST /mfa/setup`: gera secret Base32, constrói `otpauth://` (issuer, account label, digits, period, algorithm), retorna `otpauthUrl` para o site renderizar o QR.
    - `POST /mfa/verify-setup`: recebe um código TOTP, valida contra o secret, ativa MFA para o usuário, emite/mostra códigos de recuperação (hash em repouso).
  - Login com MFA:
    - `POST /auth/login`: se MFA ativo, responder `MFA_REQUIRED` com `challengeId` temporário.
    - `POST /mfa/verify-login`: recebe `challengeId` + `code` (ou recovery code), valida TOTP e finaliza a autenticação emitindo sessão/JWT.
  - Segurança e políticas:
    - Tolerância de janelas (ex.: -1, 0, +1 períodos de 30s) e prevenção de reuso no mesmo período.
    - Rate limiting dedicado a MFA, lockout progressivo, auditoria de tentativas.
    - Criptografia do secret em repouso; logs sem secrets/códigos.
    - Códigos de recuperação: únicos, exibidos uma vez, hash + consumo one-time, regeneração com invalidação.
    - “Confiar neste dispositivo” opcional com token assinado, com vínculo a device e expiração curta.

- Frontend do app autenticador (neste repo) — UX completa:
  - Scanner real de QR (câmera) com parse de `otpauth://` e fallback de entrada manual.
  - Fluxo de confirmação visual do código atual e contagem regressiva.
  - Sincronização com backend do app para backup/sync das contas (já existe CRUD; completar telas de criação/edição a partir do QR/manual).
  - Tratamento de erros de parse (issuer/label/secret ausente, Base32 inválido), variações HOTP/TOTP, e parâmetros (`digits`, `period`, `algorithm`).

## 3) Lacunas Detalhadas por Camada

### 3.1 Backend (repo atual)
- Ausente: endpoints e serviços de MFA para login do usuário (não confundir com CRUD de contas TOTP do autenticador).
- Ausente: estrutura no modelo `User` para flag de MFA ativo, secret TOTP do usuário do “site”, recovery codes, data de ativação, device trust.
- Ausente: serviço de verificação TOTP com janela e antifraude (para login).
- Observação: `AccountService` e `EncryptionService` atendem ao caso de uso do app autenticador, não do login com MFA.

### 3.2 Frontend (repo atual)
- Scanner de QR (simulado) precisa ser implementado com câmera real, parse robusto e integração para salvar conta:
  - Implementar leitura com `react-native-qrcode-scanner` ou `react-native-vision-camera` + lib de QR.
  - Usar `totpService.parseQRCodeURI` (já existente) para extrair `secret`, `issuer`, `label`, etc.
  - Criar fluxo de confirmação e persistência via `createAccount` (Redux thunk) → `apiService.createAccount`.
- Telas “em desenvolvimento” (QRScannerScreen, ManualEntryScreen, AddAccountScreen) devem:
  - Receber dados do scanner/entrada manual, validar (Base32, dígitos, período, algoritmo), e chamar API.
  - Tratar erros (secret inválido, conta duplicada).
  - Exibir prévia do TOTP gerado antes de salvar (opcional).

## 4) Plano de Implementação (Incremental)

Etapa A — Completar o app autenticador (neste repo)
1. QR Scanner real e parse
   - Implementar câmera e leitura; remover simulação.
   - Integrar `totpService.parseQRCodeURI` e normalizar issuer/label.
2. Fluxo de criação de conta a partir do QR/Manual
   - `AddAccountScreen` recebe dados, mostra prévia do TOTP (código e tempo), e salva via `createAccount`.
   - `ManualEntryScreen` com validações (Base32, range de `period` 15–60, `digits` 6/8, `algorithm` SHA1/256/512).
3. UX de feedback
   - Estados de loading/erro/sucesso; navegação para detalhes.
4. Hardening
   - Rate limit local de scans, debounce do leitor, feedback para QR inválido.

Etapa B — Backend do site (fora deste repo)
1. Endpoints
   - `POST /mfa/setup` → secret, `otpauthUrl`; `POST /mfa/verify-setup` → ativa e gera recovery codes.
   - `POST /auth/login` → `MFA_REQUIRED` quando aplicável; `POST /mfa/verify-login` → valida TOTP/recovery.
2. Modelo de dados
   - Campos em `User`: `mfaEnabled`, `mfaSecretEnc`, `mfaActivatedAt`, `mfaRecoveryHash[]`, `mfaLastCounter?`, `trustedDevices[]`.
3. Serviço TOTP
   - Validação com janela ±1, prevenção de reuso, NTP ok.
4. Segurança
   - Criptografia (“at rest”), logs sem dados sensíveis, rate limiting, auditoria.

## 5) Contratos de API (sugeridos para o backend do site)

- POST /mfa/setup
  - Resposta: `{ otpauthUrl: string, secretMasked: string }`
- POST /mfa/verify-setup `{ code: string }`
  - Resposta: `{ recoveryCodes: string[] }`
- POST /auth/login `{ email, password }`
  - Resposta: `{ status: 'MFA_REQUIRED', challengeId }` | `{ user, tokens }`
- POST /mfa/verify-login `{ challengeId, code | recoveryCode }`
  - Resposta: `{ user, tokens }`
- POST /mfa/disable `{ password, code }`
  - Resposta: `{ success: true }`

## 6) Critérios de Aceite

- App autenticador: consegue escanear QR `otpauth://`, salvar conta e exibir TOTP dinâmico, inclusive de parâmetros customizados (digits/period/algorithm).
- Backend do site: login com MFA funcional, com janelas de tolerância, rate limiting e recovery codes.
- Segurança: secrets cifrados, sem vazamento em logs, auditoria de eventos de MFA.

## 7) Riscos e Mitigações

- Drift de relógio: usar NTP no backend; aceitar janela ±1 e avaliar ±2 apenas se necessário.
- Reuso de códigos: armazenar último contador validado por usuário.
- User lockouts: recovery codes funcionais e suporte de reativação segura.

## 8) Próximos Passos no Repo Atual

- Implementar scanner real e fluxo de criação de contas nas telas `ScannerScreen`, `QRScannerScreen`, `ManualEntryScreen`, `AddAccountScreen`.
- Conectar com a API já existente para persistir as contas e exibir feedback.
- Validar e higienizar `secret` (já existe `sanitizeSecret`) antes de salvar.

——
Este documento reflete o gap entre o app autenticador (este repositório) e o backend do site que consumirá o TOTP para MFA no login. O app gera os códigos; a verificação é responsabilidade do backend do site.
