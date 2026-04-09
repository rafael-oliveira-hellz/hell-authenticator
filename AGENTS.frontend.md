# AGENTS.frontend.md

## Escopo
Instrucoes para tarefas no frontend (`frontend/`) do Hell Authenticator.
Stack principal: React Native + TypeScript + React Navigation + Redux Toolkit.

## Objetivo do frontend
- Entregar fluxos estaveis de autenticacao e gestao de contas TOTP.
- Preservar UX, navegacao e estado global sem regressao.

## Arquitetura relevante
- `frontend/App.tsx`: entrada da aplicacao.
- `frontend/src/navigation`: fluxos e stacks de navegacao.
- `frontend/src/screens`: telas por dominio (`auth`, `accounts`, `backup`, `settings`).
- `frontend/src/store`: slices Redux e estado global.
- `frontend/src/services`: API client, TOTP e criptografia.
- `frontend/src/components`: componentes reutilizaveis.

## Comandos (frontend)
Rodar em `frontend/`:
- `npm run start`
- `npm run android`
- `npm run ios`
- `npm test`
- `npm run lint`
- `npm run type-check`

## Regras tecnicas
- Nao quebrar rotas de navegacao nem nomes de parametros de tela sem alinhar impacto.
- Manter consistencia visual e comportamento de loading/erro/sucesso.
- Evitar renderizacao desnecessaria e atualizacoes de estado redundantes.
- Nao expor dados sensiveis em logs, toast ou tela.
- Ao mexer em fluxo critico, validar estados vazio, erro de rede e retry.

## Checklist por tipo de tarefa

### Bugfix
1. Reproduzir em tela/fluxo especifico.
2. Corrigir causa raiz sem efeito colateral em outras telas.
3. Cobrir em teste (unitario/integracao quando viavel).
4. Rodar `lint`, `type-check` e `test`.

### Feature
1. Mapear impacto em navegacao, estado e servicos.
2. Implementar UI + estado + integracao API.
3. Cobrir sucesso, erro e borda de UX.
4. Documentar validacao manual em Android/iOS quando necessario.

### Refactor
1. Preservar comportamento visual e contratos de props.
2. Refatorar em passos pequenos.
3. Garantir testes existentes e adicionar cobertura faltante.

## Prompts prontos (frontend)

### Prompt: bugfix frontend
```txt
Corrija este bug no frontend: [descricao].
Tela/fluxo: [screen + acao].
Comportamento atual: [erro].
Comportamento esperado: [resultado].
Restricoes: sem alterar UX fora do escopo.
Faca: causa raiz -> correcao minima -> testes -> lint/type-check/test.
```

### Prompt: feature frontend
```txt
Implemente a feature frontend: [nome].
Escopo de UX: [telas/estados/componentes].
Regras: [validacoes/comportamento offline/loading/erro].
Integracao: [endpoint ou servico].
Entregue codigo + testes + passos de validacao manual.
```

### Prompt: refactor frontend
```txt
Refatore [arquivo/modulo frontend] para [objetivo], sem alterar comportamento visual/funcional externo.
Garanta compatibilidade com navegacao e estado atual.
Execute lint/type-check/test e reporte riscos residuais.
```

### Prompt: review frontend
```txt
Revise este diff frontend com foco em bugs de estado/navegacao, regressao de UX, performance de render e lacunas de teste.
Liste findings por severidade com arquivo/linha e sugestao objetiva.
```

## Definition of Done (frontend)
- `npm run lint` passa.
- `npm run type-check` passa.
- `npm test` passa (e regressao coberta quando aplicavel).
- Fluxo principal validado sem quebra de navegacao.
- Resumo final inclui arquivos alterados, validacao e riscos.
