# Plano de Acao - Correcao dos Problemas do Backend (2026-03-07)

## Objetivo
Corrigir vulnerabilidades, regressao de contrato, riscos operacionais e lacunas de teste do backend, alinhando com o objetivo do projeto (seguranca, confiabilidade, privacidade e estabilidade de API).

## Prioridade de execucao
1. Bloquear riscos de seguranca e autorizacao (Critico/Alto).
2. Corrigir falhas de contrato e confiabilidade operacional.
3. Estruturar qualidade minima (lint/typecheck/testes/CI).
4. Expandir cobertura de testes para evitar regressao.

## Fase 0 - Preparacao (Dia 0)
- Criar branch de trabalho dedicada para hardening do backend.
- Definir baseline de validacao:
  - `npm run lint`
  - `npm run type-check`
  - `npm test`
- Criar checklists no PR vinculados aos itens deste plano.

## Fase 1 - Correcoes Criticas de Seguranca (Dia 1)

### 1.1 Corrigir IDOR de backup
- Arquivos:
  - `backend/src/routes/backup.ts`
  - `backend/src/services/BackupService.ts`
- Acoes:
  - Alterar `uploadToCloud` e `downloadFromCloud` para receber `userId`.
  - Filtrar backup por `{ id, userId, isActive: true }`.
  - Ajustar chamadas das rotas para usar `authenticatedRequest.user.id`.
- Validacao:
  - Teste de integracao: usuario A nao consegue acessar backup do usuario B (esperado 404/403).

### 1.2 Restauracao de backup com validacao real de senha
- Arquivos:
  - `backend/src/services/BackupService.ts`
  - `backend/src/routes/backup.ts`
- Acoes:
  - Carregar usuario autenticado e validar `password` com bcrypt.
  - Retornar 401 para senha invalida.
  - Opcional: remover `password` do contrato apenas se decisao de produto formal.
- Validacao:
  - Teste: restore com senha invalida falha; com senha valida passa.

### 1.3 Restringir limpeza de expirados
- Arquivos:
  - `backend/src/routes/backup.ts`
  - `backend/src/services/BackupService.ts`
- Acoes:
  - Escolher modelo:
    - job interno/admin-only, ou
    - limpeza por usuario autenticado.
  - Implementar autorizacao explicita.
- Validacao:
  - Teste: usuario premium comum nao dispara limpeza global.

## Fase 2 - Hardening Alto Impacto (Dia 1-2)

### 2.1 Remover segredos dos logs
- Arquivo: `backend/src/app.ts`
- Acoes:
  - Sanitizar `authorization`, `cookie`, `x-api-key` e equivalentes no serializer de request.
  - Garantir que payloads sensiveis nao entram em logs de erro.
- Validacao:
  - Teste unitario/integração verificando mascaramento no logger.

### 2.2 Preservar status code correto no error handler
- Arquivo: `backend/src/app.ts`
- Acoes:
  - Usar `error.statusCode ?? 500`.
  - Definir formato de erro padrao sem quebrar codigos de validacao/autorizacao.
- Validacao:
  - Teste: erro de schema retorna 400, nao 500.

### 2.3 Endurecer confianca de proxy e origem de IP
- Arquivos:
  - `backend/src/app.ts`
  - `backend/src/plugins/rate-limit.ts`
- Acoes:
  - Configurar `trustProxy` com lista/CIDR controlada.
  - Revisar `keyGenerator` para usar IP confiavel.
- Validacao:
  - Teste com cabecalhos `x-forwarded-for` maliciosos.

### 2.4 Corrigir TLS de banco em producao
- Arquivo: `backend/src/config/database.ts`
- Acoes:
  - Trocar `rejectUnauthorized: false` por validacao real de certificado.
  - Introduzir variavel de ambiente explicita para CA/cert.
- Validacao:
  - Smoke test em ambiente com TLS habilitado.

## Fase 3 - Contrato e Regra de Negocio (Dia 2-3)

### 3.1 Corrigir cleanup de expirados
- Arquivo: `backend/src/services/BackupService.ts`
- Acoes:
  - Substituir filtro por `LessThan(new Date())`.
- Validacao:
  - Teste: backup expirado e limpo, nao expirado e preservado.

### 3.2 Corrigir parse/restauracao de metadata
- Arquivo: `backend/src/services/AccountService.ts`
- Acoes:
  - Aceitar metadata objeto e string JSON.
  - Validar estrutura antes de salvar.
- Validacao:
  - Teste: restore preserva metadata em ambos formatos.

### 3.3 Alinhar contrato de `period`
- Arquivos:
  - `backend/src/routes/accounts.ts`
  - `backend/src/services/AccountService.ts`
  - `backend/src/types/index.ts`
- Acoes:
  - Decidir contrato final (recomendado enum 15/30/60).
  - Alinhar schema AJV + tipos TS + validacao do service.
- Validacao:
  - Testes de contrato para valores validos/invalidos.

### 3.4 Corrigir health check de Redis
- Arquivo: `backend/src/routes/health.ts`
- Acoes:
  - Implementar ping real no Redis e refletir status correto.
- Validacao:
  - Teste com Redis disponivel e indisponivel.

### 3.5 Corrigir gerador de chave criptografica
- Arquivo: `backend/src/services/EncryptionService.ts`
- Acoes:
  - Gerar e serializar chave sem truncamento de entropia.
- Validacao:
  - Teste: chave valida funciona no ciclo encrypt/decrypt.

## Fase 4 - Estabilidade de Build e Operacao (Dia 3)

### 4.1 Consertar type-check JWT
- Arquivo: `backend/src/services/AuthService.ts`
- Acoes:
  - Tipar `expiresIn` conforme `jsonwebtoken`.
  - Ajustar chamadas `sign` para satisfazer overloads.
- Validacao:
  - `npm run type-check` verde.

### 4.2 Corrigir scripts quebrados de migrate/seed
- Arquivo: `backend/package.json`
- Acoes:
  - Criar arquivos referenciados (`src/migrations/*`, `src/scripts/seed.ts`) ou remover scripts ate implementacao real.
- Validacao:
  - `npm run migrate` e `npm run seed` com comportamento previsivel.

### 4.3 Implantar configuracao de lint
- Arquivos esperados:
  - `backend/.eslintrc.*`
  - opcional `backend/.eslintignore`
- Acoes:
  - Definir regras minimas e script lint funcional.
- Validacao:
  - `npm run lint` verde.

## Fase 5 - Plano de Testes Completo (Dia 3-5)

### 5.1 Infra de testes
- Criar estrutura:
  - `backend/tests/unit`
  - `backend/tests/integration`
- Configurar jest para TypeScript e banco de teste.

### 5.2 Suite minima obrigatoria
- Auth:
  - register/login/refresh/logout/logout-all
  - erros de credenciais e usuario bloqueado
- Accounts:
  - CRUD basico
  - contrato de `period`
  - nao exposicao de secret
- Backup:
  - ownership (anti-IDOR)
  - restore com senha
  - cleanup expirados
  - upload/download autorizado
- Observabilidade/seguranca:
  - status code correto em error handler
  - mascaramento de dados sensiveis em log

### 5.3 Meta de cobertura e gates
- Meta inicial: >=70% nas areas alteradas.
- Meta alvo do backend: >=90% (alinhado a docs/).
- CI deve bloquear merge em caso de falha de lint/typecheck/testes.

## Fase 6 - CI/CD e governanca (Dia 5)
- Pipeline obrigatorio no backend:
  - `npm run lint`
  - `npm run type-check`
  - `npm test -- --runInBand` (ou setup confiavel multiworker)
- Politica de PR:
  - sem merge com regressao de contrato.
  - sem merge com novos `any` nas camadas de dominio/servico.

## Matriz problema -> entrega
1. IDOR backup -> filtros por `userId` + testes de autorizacao.
2. Restore sem senha efetiva -> validacao bcrypt + testes 401/200.
3. Cleanup global premium -> policy de autorizacao + teste de escopo.
4. Vazamento de header -> logger sanitizado + teste de redacao.
5. 500 indevido -> error handler preserva status + testes de contrato.
6. trustProxy aberto -> lista confiavel + teste de spoof.
7. TLS frouxo DB -> TLS validado + smoke test.
8. Expiracao cleanup bug -> `LessThan(now)` + teste.
9. Metadata perdida -> normalizacao + teste.
10. `period` inconsistente -> contrato unico + testes.
11. Health Redis fake -> ping real + teste.
12. Chave truncada -> geracao correta + teste.
13. Scripts invalidos -> scripts reais ou remocao.
14. Lint ausente -> config ESLint funcional.
15. Type-check quebrado -> tipagem JWT corrigida.
16. Sem testes -> suite backend implementada.

## Definicao de pronto
1. Todos os itens Critico e Alto corrigidos e com testes de regressao.
2. `npm run lint`, `npm run type-check` e `npm test` passando no backend.
3. Contratos HTTP principais validados por testes de integracao.
4. Nenhum endpoint retorna secret TOTP em texto puro.
5. Checklist de seguranca dos docs atendido para os itens aplicaveis ao backend.
