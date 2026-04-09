# Hell Authenticator - Compliance TODO (Atualizado em 2026-03-08)

## Objetivo
Consolidar o que ja foi corrigido e o que ainda falta para aderir ao baseline de compliance tecnico do projeto.

## Resumo executivo
- Backend de seguranca/contrato foi hardenizado e estabilizado com testes de regressao.
- Redis foi adotado como store principal de sessao para fluxos de autenticacao (com Postgres mantido como auditoria best-effort).
- Cobertura backend subiu para **82.55% statements** (meta intermediaria >=70 atingida e superada em 2026-03-08).
- Pendencias principais agora estao concentradas em roadmap arquitetural e trilha mobile.

---

## Status por tema

### Backend - Seguranca e contrato
- [x] JWT com HS512 no `sign` e `verify`.
- [x] Teste de header JWT `alg=HS512` + rejeicao de algoritmo divergente.
- [x] AES-256-GCM backend com `createCipheriv/createDecipheriv`, `authTag` e formato `iv:tag:ciphertext`.
- [x] Testes de integridade criptografica (tamper em `authTag/ciphertext`).
- [x] Nao exposicao de secret TOTP em `/api/accounts/:id/backup-data`.
- [x] Backup ownership anti-IDOR (upload/download por `userId`).
- [x] Restore de backup com validacao real de senha (401 para invalida).
- [x] Cleanup de expirados escopado por usuario autenticado.
- [x] Filtro de expirados corrigido para `< now`.
- [x] Health Redis real e readiness com HTTP 503 quando dependencia falha.
- [x] Error handler preserva `statusCode` quando definido.
- [x] Sanitizacao de headers sensiveis em logs.
- [x] `trustProxy` endurecido e suporte explicito a `TRUST_PROXY=apprunner`.
- [x] TLS DB com `rejectUnauthorized` seguro por default.
- [x] Lint/type-check/test/build do backend passando.

### Backend - Qualidade tecnica
- [x] Sessao principal em Redis para `login/refresh/logout/logout-all`.
- [x] Remocao de `any` nas camadas alvo do backend (`models` e `plugins` criticos).
- [x] Cobertura intermediaria >=70 (atual 82.55%).
- [x] Cobertura >=90 nos dominios criticos (`auth`, `backup`, `security`) com gate no Jest (coverageThreshold por arquivo).
- [x] Integracao Winston estruturado completa (aplicacao/servicos + fluxo HTTP Fastify), com redacao padrao e transporte configuravel.
- [~] Reorganizacao arquitetural incremental para `domain/application/infrastructure/interface` (fatias auth + accounts + backup avancaram com use-cases extraidos para login/refresh/logout/logout-all/create-account/backup-data/create-backup/restore-backup).

### Mobile - Em andamento (alto escopo)
- [~] Adocao de React Query avancou em contas e backup (`AccountListScreen`/`HomeScreen` com `useQuery`; `AddAccountScreen`/`EditAccountScreen`/`AccountDetailScreen` com `useMutation`; `BackupListScreen`/`BackupDetailScreen` com `useQuery` e `CreateBackupScreen`/`RestoreBackupScreen`/delete em detail com `useMutation` + invalidacao de cache), migracao sistematica ainda pendente.
- [~] Tema canonico vermelho/preto centralizado em src/constants/colors.ts e aplicado nas entradas principais (App.tsx, HomeScreen, AccountListScreen); propagacao principal concluida; pendente apenas refinamento visual e remocao de inline-style warnings.
- [x] Criptografia local AES-256-GCM implementada no mobile com chave mestre em Keychain/Keystore e storage seguro via EncryptedStorage (`frontend/src/services/encryption.ts`).
- [~] Correcao de regressao no parser `otpauth://` + testes unitarios de `totpService` adicionados e passando.
- [x] Remocao de `any` no mobile (codigo de aplicacao em `App.tsx` e `src/` sem `any` explicito).
- [x] Cobertura >=85% e suite Detox para fluxos criticos (cobertura em 88.62% statements; Detox instalado, build Android E2E em modo release (`app:assembleRelease` + `app:assembleReleaseAndroidTest`), suite `auth-flow` + `smoke` pronta em `frontend/e2e`, CI com job `frontend-e2e` e AVD configuravel via `DETOX_AVD_NAME`; em ambiente local ainda exige `ANDROID_SDK_ROOT` definido e AVD existente).

### Infra / repositorio - Ainda pendente
- [x] `docker-compose.yml` e exemplos de ambiente sem segredos inline versionados.
- [x] Pipeline CI/CD formal com gates obrigatorios para backend+mobile evidenciado no repo (.github/workflows/ci.yml).
- [ ] Evolucao estrutural `frontend/` -> `mobile/` e `shared/` (se mantido no roadmap).

---

## Referencias de execucao
- Plano tecnico: `docs/hell-authenticator-compliance-action-plan-2026-03-07.md`.
- Fechamento tecnico anterior: `docs/backend-remediation-closure-2026-03-07.md`.

























