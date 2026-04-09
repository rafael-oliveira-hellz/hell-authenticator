# Revisao Backend - Achados (2026-03-07)

## Escopo revisado
- Codigo em `backend/src` (rotas, services, middlewares, plugins, config, models).
- Scripts e estrutura operacional do pacote `backend`.
- Contexto de produto e seguranca em `docs/`.

## Achados por severidade

### Critico
1. IDOR em upload/download de backup (sem ownership por usuario autenticado)
- Arquivos/linhas:
  - `backend/src/routes/backup.ts:242`
  - `backend/src/routes/backup.ts:274`
  - `backend/src/services/BackupService.ts:209`
  - `backend/src/services/BackupService.ts:232`
- Risco: usuario autenticado consegue operar backup de outro usuario se conhecer o `backupId`.
- Sugestao objetiva: exigir `userId` no service (`where: { id, userId, isActive: true }`) e passar `authenticatedRequest.user.id` nas rotas.

2. Restore de backup exige senha no contrato, mas senha e ignorada
- Arquivos/linhas:
  - `backend/src/routes/backup.ts:149`
  - `backend/src/services/BackupService.ts:128`
- Risco: falsa garantia de seguranca no endpoint de restauracao.
- Sugestao objetiva: validar senha do usuario (bcrypt compare) antes de restaurar; se nao for requisito real, remover `password` do schema/DTO/contrato.

3. Limpeza de backups expirados permite impacto global por usuario premium
- Arquivos/linhas:
  - `backend/src/routes/backup.ts:331`
  - `backend/src/services/BackupService.ts:262`
- Risco: um premium pode acionar limpeza para todos os usuarios (efeito administrativo sem autorizacao adequada).
- Sugestao objetiva: restringir para job interno/admin, ou mudar para limpeza somente do proprio `userId`.

### Alto
4. Vazamento potencial de token/segredos em log de request
- Arquivo/linha: `backend/src/app.ts:35`
- Risco: serializer loga `headers` completos, incluindo `authorization`/cookies.
- Sugestao objetiva: redigir/remover headers sensiveis no serializer antes de logar.

5. Handler global converte erros em 500 e pode quebrar contrato HTTP
- Arquivo/linha: `backend/src/app.ts:77`
- Risco: erros de validacao/authz podem ser mascarados como 500.
- Sugestao objetiva: preservar `error.statusCode` quando existir e padronizar resposta sem destruir o status original.

6. `trustProxy: true` sem lista de proxies confiaveis
- Arquivos/linhas:
  - `backend/src/app.ts:44`
  - `backend/src/plugins/rate-limit.ts:13`
- Risco: spoof de IP afeta rate-limit, auditoria e deteccao de abuso.
- Sugestao objetiva: configurar lista/CIDR de proxy confiavel ou desativar fora de ambiente controlado.

7. Configuracao TLS do banco em producao aceita certificado nao validado
- Arquivo/linha: `backend/src/config/database.ts:23`
- Risco: `rejectUnauthorized: false` reduz garantias contra MITM.
- Sugestao objetiva: habilitar validacao de certificado em producao e usar CA confiavel.

### Medio
8. Filtro de expirados incorreto em cleanup
- Arquivo/linha: `backend/src/services/BackupService.ts:266`
- Risco: consulta por igualdade (`expiresAt: new Date()`) raramente encontra registros.
- Sugestao objetiva: usar operador `< now` (`LessThan(new Date())` no TypeORM).

9. Perda silenciosa de metadata no restore
- Arquivo/linha: `backend/src/services/AccountService.ts:269`
- Risco: quando `metadata` vier como objeto, branch atual ignora e perde dados.
- Sugestao objetiva: suportar objeto e string JSON, com validacao e normalizacao.

10. Contrato inconsistente para `period` de TOTP
- Arquivos/linhas:
  - `backend/src/routes/accounts.ts:45`
  - `backend/src/services/AccountService.ts:373`
  - `backend/src/types/index.ts:7`
- Risco: API aceita 15..60, mas tipo compartilhado define apenas 15|30|60.
- Sugestao objetiva: alinhar contrato completo (preferencialmente enum 15/30/60 em schema e service).

11. Health check detalhado informa Redis como saudavel sem verificar
- Arquivo/linha: `backend/src/routes/health.ts:29`
- Risco: observabilidade enganosa e falso positivo operacional.
- Sugestao objetiva: implementar health check real de Redis e refletir status verdadeiro.

12. Geracao de chave no `EncryptionService` reduz entropia util
- Arquivo/linha: `backend/src/services/EncryptionService.ts:88`
- Risco: `base64().slice(0,32)` nao preserva 32 bytes reais de entropia de forma adequada.
- Sugestao objetiva: gerar chave binaria 32 bytes e serializar completo (hex/base64 sem truncar).

### Baixo / Operacional
13. Scripts de migracao/seed apontam para arquivos inexistentes
- Arquivos/linhas:
  - `backend/package.json:14`
  - `backend/package.json:15`
  - `backend/package.json:16`
- Risco: pipeline e onboarding quebram.
- Sugestao objetiva: criar scripts/arquivos referenciados ou remover scripts invalidos.

14. Configuracao de lint ausente no pacote backend
- Evidencia: `npm run lint` falha por ausencia de arquivo de configuracao ESLint.
- Risco: sem gate estatico consistente de qualidade.
- Sugestao objetiva: adicionar `.eslintrc.*` e integrar no CI.

15. Type-check quebrado em emissao de JWT
- Arquivo/linha: `backend/src/services/AuthService.ts:224`
- Risco: build/CI falham e impedem release confiavel.
- Sugestao objetiva: tipar `expiresIn` conforme `jsonwebtoken` (`SignOptions['expiresIn']`) e ajustar payload/opcoes.

## Lacunas de teste (todas identificadas)
1. Nao existem testes do backend no repositorio (Jest sem matches).
2. Nao ha cobertura para controle de acesso por ownership em backup (upload/download/delete/restore).
3. Nao ha cobertura de contrato HTTP (status codes e payloads de erro/sucesso).
4. Nao ha cobertura para fluxos criticos de auth (`register`, `login`, `refresh`, `logout`, `logout-all`).
5. Nao ha cobertura para seguranca de dados sensiveis (nao exposicao de secrets, mascaramento de logs).
6. Nao ha cobertura de regressao para cleanup de expirados.
7. Nao ha cobertura para validacao de criptografia (`encrypt/decrypt`, integridade GCM).
8. Nao ha cobertura para consistencia de schema compartilhado (`period`, DTOs).

## Evidencias de validacao executada
- `npm.cmd run lint`: falhou (sem configuracao ESLint no backend).
- `npm.cmd run type-check`: falhou com erro de tipos em `AuthService.ts`.
- `npm.cmd test -- --runInBand`: sem testes encontrados.
