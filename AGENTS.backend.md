# AGENTS.backend.md

## Escopo
Instrucoes para tarefas no backend (`backend/`) do Hell Authenticator.
Stack principal: Fastify + TypeScript + TypeORM + PostgreSQL + JWT.

## Objetivo do backend
- Expor APIs seguras e estaveis para auth, contas e backup.
- Manter regras de negocio no `services/` e contratos consistentes nas `routes/`.

## Arquitetura relevante
- `backend/src/app.ts`: bootstrap do servidor.
- `backend/src/routes`: definicao de endpoints e schemas.
- `backend/src/services`: regras de negocio.
- `backend/src/models`: entidades TypeORM.
- `backend/src/middlewares`: auth/seguranca.
- `backend/src/config`: ambiente e conexao de banco.

## Comandos (backend)
Rodar em `backend/`:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm test`
- `npm run test:coverage`
- `npm run lint`
- `npm run type-check`
- `npm run migrate`
- `npm run seed`

## Regras tecnicas
- Validar input em borda de API (tipos, campos obrigatorios, limites).
- Preservar contratos existentes (status code, formato de resposta, mensagens esperadas).
- Nao introduzir breaking change sem sinalizar explicitamente.
- Tratar erros com contexto, sem vazar detalhes sensiveis.
- Nunca logar token, senha, segredo de criptografia ou payload sensivel.
- Mudanca em schema/migracao exige impacto mapeado e plano de rollback.

## Checklist por tipo de tarefa

### Bugfix
1. Reproduzir bug e localizar causa raiz.
2. Corrigir com a menor mudanca correta.
3. Cobrir com teste de regressao.
4. Rodar `lint`, `type-check` e `test`.

### Feature
1. Definir contrato de entrada/saida.
2. Implementar rota + service + validacoes.
3. Cobrir sucesso, erro e borda.
4. Documentar impacto em clientes.

### Refactor
1. Garantir que comportamento externo nao muda.
2. Refatorar incrementalmente.
3. Manter testes verdes e adicionar cobertura faltante.

## Prompts prontos (backend)

### Prompt: bugfix backend
```txt
Corrija este bug no backend: [descricao].
Contexto: [endpoint/servico afetado].
Erro atual: [stacktrace/comportamento].
Esperado: [comportamento correto].
Restricoes: sem breaking change e sem refactor amplo.
Faca: causa raiz -> correcao minima -> teste de regressao -> lint/type-check/test.
```

### Prompt: feature backend
```txt
Implemente a feature backend: [nome].
Contrato esperado: [request/response/status].
Regras de negocio: [lista].
Requisitos de seguranca: [auth/authz/rate-limit/validacoes].
Entregue codigo + testes + como validar localmente.
```

### Prompt: refactor backend
```txt
Refatore [arquivo/modulo backend] para [objetivo], sem alterar contrato externo.
Preserve status codes e payloads atuais.
Execute lint/type-check/test e reporte riscos residuais.
```

### Prompt: review backend
```txt
Revise este diff backend com foco em bugs, regressao de contrato, seguranca e lacunas de teste.
Liste findings por severidade com arquivo/linha e sugestao objetiva.
```

## Definition of Done (backend)
- `npm run lint` passa.
- `npm run type-check` passa.
- `npm test` passa (e regressao coberta quando aplicavel).
- Sem alteracao acidental de contrato.
- Resumo final inclui arquivos alterados, validacao e riscos.
