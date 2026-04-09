# Secrets e Variaveis de Ambiente (Dev)

## Objetivo
Evitar segredos inline em arquivos versionados e padronizar setup local.

## Arquivos de referencia
- Raiz do monorepo: `.env.example`
- Backend: `backend/.env.example`

## Setup rapido
1. Copie `.env.example` para `.env` na raiz.
2. Copie `backend/.env.example` para `backend/.env` se rodar backend fora do compose.
3. Altere todos os valores `change_me_*` antes de subir ambiente.

## Compose
- `docker-compose.yml` agora usa somente variaveis `${VAR}`.
- Execute com:
  - `docker compose --env-file .env up -d`

## Producao
- Nao usar `.env` versionado.
- Injetar secrets via secret manager da plataforma (App Runner / SSM / Secrets Manager).
- Manter `DB_SSL_REJECT_UNAUTHORIZED=true`.
- Para App Runner com API Gateway na frente, usar `TRUST_PROXY=apprunner`.
