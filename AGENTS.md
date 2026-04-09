# AGENTS.md

## Guias especializados
- Backend: `AGENTS.backend.md`
- Frontend: `AGENTS.frontend.md`

## Quando usar cada um
- Use `AGENTS.backend.md` quando a tarefa envolver API, rotas, services, models, auth, banco, migracoes ou contratos de backend.
- Use `AGENTS.frontend.md` quando a tarefa envolver telas, navegacao, componentes, estado Redux, integracao cliente API ou UX mobile.
- Use este `AGENTS.md` para regras gerais do monorepo e para tarefas que cruzam backend + frontend.


## Objetivo
Este repositorio e um monorepo do Hell Authenticator com:
- `backend`: API Fastify + TypeScript para autenticacao, contas, backup e seguranca.
- `frontend`: app React Native + TypeScript (Android/iOS) para gestao de contas TOTP.

O agente deve priorizar mudancas pequenas, seguras e testaveis, preservando o comportamento existente fora do escopo solicitado.

## Estrutura do projeto
- `backend/src/app.ts`: bootstrap da API.
- `backend/src/routes`: rotas (`auth`, `accounts`, `backup`, `health`).
- `backend/src/services`: regras de negocio.
- `backend/src/models`: entidades/modelos.
- `backend/src/config`: banco e ambiente.
- `frontend/App.tsx`: entrada do app.
- `frontend/src/screens`: telas por dominio.
- `frontend/src/navigation`: navegacao.
- `frontend/src/store`: estado global (Redux slices).
- `frontend/src/services`: API, TOTP e criptografia no cliente.

## Ambiente e versoes
- Node.js `>=18`
- npm `>=8`
- Banco principal: PostgreSQL
- Infra local opcional via Docker Compose (`docker-compose.yml`)

## Comandos oficiais
Execute no diretorio correto de cada pacote.

### Backend (`backend/`)
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Testes: `npm test`
- Cobertura: `npm run test:coverage`
- Lint: `npm run lint`
- Typecheck: `npm run type-check`
- Migracoes: `npm run migrate`
- Seed: `npm run seed`

### Frontend (`frontend/`)
- Metro: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Testes: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run type-check`

## Regras de implementacao
- Altere apenas os arquivos necessarios para o objetivo.
- Nao introduza refactors amplos em tarefas de bugfix.
- Evite novas dependencias sem necessidade clara.
- Mantenha padroes existentes de nomenclatura, logs e tratamento de erro.
- Nao vaze segredos, tokens, chaves ou dados sensiveis em logs/erros.
- Em alteracoes de contrato (API, payload, estado), atualizar testes e documentar impacto.

## Criterios de pronto (Definition of Done)
Considere a tarefa pronta somente quando:
1. Build/typecheck/lint do pacote alterado estiverem passando.
2. Testes relevantes forem adicionados/ajustados e estiverem passando.
3. Fluxo principal + caso de erro + borda principal forem cobertos.
4. Nao houver mudancas fora do escopo.

## Fluxo padrao para o agente
1. Entender contexto e delimitar escopo.
2. Localizar causa raiz (bug) ou pontos de extensao (feature).
3. Implementar a menor mudanca correta.
4. Validar com lint/typecheck/testes.
5. Entregar resumo objetivo:
   - o que mudou,
   - por que mudou,
   - como validar,
   - riscos/pendencias.

## Modelos de prompt

### Bugfix
```txt
Corrija o bug: [descricao].
Sintoma atual: [erro/comportamento].
Comportamento esperado: [resultado].
Restricoes: mude apenas o necessario, sem refactor amplo.
Passos:
1) encontrar causa raiz,
2) implementar correcao minima,
3) criar/ajustar testes de regressao,
4) rodar lint + typecheck + testes do pacote afetado,
5) resumir causa, correcao e validacao.
```

### Feature
```txt
Implemente a feature: [nome].
Requisitos funcionais: [lista].
Nao funcionais: [performance/seguranca/compatibilidade].
Passos:
1) implementar fluxo completo,
2) adicionar testes (sucesso/erro/borda),
3) atualizar docs necessarias,
4) descrever como validar manualmente.
```

### Refactor
```txt
Refatore [modulo/arquivo] para [objetivo], sem alterar comportamento externo.
Passos:
1) mapear contratos e efeitos colaterais,
2) refatorar incrementalmente,
3) garantir testes existentes verdes,
4) adicionar testes faltantes para proteger comportamento atual.
Entregue riscos residuais e impacto.
```

### Revisao de codigo
```txt
Revise este diff com foco em:
1) bugs e regressoes,
2) seguranca,
3) performance,
4) lacunas de testes.
Liste achados por severidade com arquivo/linha e sugestao objetiva.
```

### Performance
```txt
Otimize [endpoint/fluxo].
Metrica alvo: [latencia/memoria/throughput].
Passos:
1) identificar gargalo,
2) implementar melhorias de maior impacto e menor risco,
3) apresentar comparacao antes/depois,
4) descrever trade-offs.
```

## Dicas para usar melhor o Codex
- Sempre inclua: objetivo, escopo, restricoes e definicao de pronto.
- Informe o que nao pode mudar (API, schema, UX, contratos).
- Para bugs, forneca reproducao, erro exato e contexto de ambiente.
- Peca explicitamente testes e validacoes finais.
- Divida tarefas grandes em etapas menores e verificaveis.
- Para mudancas arriscadas, solicite plano curto antes da implementacao.
