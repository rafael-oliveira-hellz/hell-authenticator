# Hell Authenticator - Action Plan de Compliance (2026-03-07)

## Objetivo
Implementar o backlog de compliance ainda pendente com foco em menor risco de regressao e maior impacto em seguranca/confiabilidade.

## Status consolidado em 2026-03-08
- [x] Fase 1.1 - segredos inline removidos para ambiente de desenvolvimento.
- [x] Fase 1.2 - hardening de logs no runtime path critico.
- [x] Fase 1.3 - testes de JWT HS512 + tamper crypto.
- [x] Fase 2 - sessao em Redis (source of truth para auth flows).
- [x] Fase 3 - remocao de `any` no escopo backend definido.
- [x] Fase 4.1 - cobertura geral >=70 (atual 82.55%).
- [x] Fase 4.2 - cobertura >=90 por dominio critico (atingido para auth/backup/security em 2026-03-08) com gate no Jest (coverageThreshold).
- [x] Fase 5 - observabilidade com Winston (logger estruturado + bridge HTTP Fastify concluido).
- [~] Fase 6 - arquitetura DDD/Clean incremental (fatias 1-3 concluídas e auth ampliado com `LogoutUserUseCase`/`LogoutAllSessionsUseCase`, sem quebra de contrato).
- [x] Fase 7 - trilha mobile compliance concluida (React Query em contas/backup, crypto local AES-GCM, tema centralizado, lint/type-check/testes frontend verdes, cobertura em 88.62% statements >=85, Detox operacional com build Android E2E validado e suite inicial de fluxos criticos em `frontend/e2e`, CI com job dedicado).

## Principios de execucao
- Mudancas pequenas e incrementais por PR.
- Cada etapa com teste de regressao e validacao (`lint`, `type-check`, `test`).
- Evitar big-bang de arquitetura.

## Fase 4.2 - Proximo foco tecnico
### Meta final
- Planejar >=90% por dominio critico (auth/backup/security), com gate gradual no CI.

## Fase 5 - Observabilidade com Winston (1-2 dias)
### 5.1 Integracao do logger estruturado
- Escopo:
  - novo modulo `backend/src/infrastructure/logging/winstonLogger.ts`
  - bridge com Fastify logger.
- Entrega:
  - formato JSON + redacao padrao (`password`, `token`, `secret`, `key`, `hash`, `pin`).
- Criterio de aceite:
  - testes de redacao + logs estruturados consistentes.

## Fase 6 - Arquitetura DDD/Clean incremental (roadmap, nao big-bang)
### 6.1 Vertical slice por contexto (Identity -> Accounts -> Backup)
- Para cada contexto:
  - extrair um caso de uso por vez.
  - manter adaptador para rotas atuais.
  - migrar sem quebrar contrato externo.

### 6.2 Ordem sugerida
1. `LoginUserUseCase` / `RefreshTokenUseCase` / `LogoutUserUseCase` / `LogoutAllSessionsUseCase`.
2. `CreateAccountUseCase` / `GetAccountBackupDataUseCase`.
3. `CreateBackupUseCase` / `RestoreBackupUseCase`.

## Fase 7 - Mobile compliance (paralelo em trilha separada)
- Adotar React Query por dominio.
- Migrar crypto local para AES-GCM + Keychain/Keystore.
- Ajustar tema canonico centralizado.
- Subir cobertura e Detox.

## CI/CD recomendado para acompanhar o plano
- Backend gates obrigatorios:
  - `npm run lint`
  - `npm run type-check`
  - `npm test -- --runInBand`
  - `npm run build`
- Cobertura:
  - gate inicial >=70 geral (ja atingido).
  - gate incremental por modulo critico ate >=90 (ja formalizado para auth/backup/security no Jest).






















## Pre-condicoes Detox local
- Definir ANDROID_SDK_ROOT.
- Ter ao menos 1 AVD criado (ou exportar DETOX_AVD_NAME).


- Bootstrap unico local para Detox Android: 
pm run e2e:bootstrap (script rontend/scripts/bootstrap-detox-android.ps1).

