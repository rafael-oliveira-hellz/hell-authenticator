# Hell Authenticator Backend

The backend package powers the Hell Authenticator API. It is built with Fastify, TypeScript, PostgreSQL, Redis, and TypeORM, and exposes endpoints for authentication, account management, backup flows, health checks, and operational tooling.

## Contents

- [Overview](#overview)
- [Stack](#stack)
- [Project Layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running the Service](#running-the-service)
- [Database and Seed Workflow](#database-and-seed-workflow)
- [Docker](#docker)
- [Cloud Backup Providers](#cloud-backup-providers)
- [API Surface](#api-surface)
- [Security Notes](#security-notes)
- [Scripts](#scripts)
- [Testing](#testing)
- [Observability](#observability)
- [Troubleshooting](#troubleshooting)

## Overview

This package provides:

- user registration and login
- JWT-based authentication
- refresh token rotation
- session tracking with Redis and an audit session store
- account and backup domain APIs
- health endpoints and Swagger documentation
- structured logging and Prometheus metrics

Entry point:

- [src/app.ts](E:\08%20-%20Hell%20Authenticator\backend\src\app.ts)

## Stack

- Fastify
- TypeScript
- TypeORM
- PostgreSQL
- Redis
- bcrypt
- jsonwebtoken
- Winston
- Jest

## Project Layout

```text
backend/
├── src/
│   ├── app.ts
│   ├── application/
│   ├── config/
│   ├── middlewares/
│   ├── migrations/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── types/
│   └── utils/
├── .env.example
├── Dockerfile.dev
├── jest.config.js
├── package.json
└── tsconfig.json
```

Important paths:

- [src/routes/auth.ts](E:\08%20-%20Hell%20Authenticator\backend\src\routes\auth.ts)
- [src/routes/accounts.ts](E:\08%20-%20Hell%20Authenticator\backend\src\routes\accounts.ts)
- [src/routes/backup.ts](E:\08%20-%20Hell%20Authenticator\backend\src\routes\backup.ts)
- [src/config/database.ts](E:\08%20-%20Hell%20Authenticator\backend\src\config\database.ts)
- [src/config/environment.ts](E:\08%20-%20Hell%20Authenticator\backend\src\config\environment.ts)
- [src/services/AuthService.ts](E:\08%20-%20Hell%20Authenticator\backend\src\services\AuthService.ts)
- [src/scripts/seed.ts](E:\08%20-%20Hell%20Authenticator\backend\src\scripts\seed.ts)

## Prerequisites

- Node.js `>= 18`
- npm `>= 8`
- PostgreSQL
- Redis
- Docker Desktop recommended for local infrastructure

## Environment Variables

The recommended starting point is:

- [backend/.env.example](E:\08%20-%20Hell%20Authenticator\backend\.env.example)

Critical variables include:

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `ENCRYPTION_KEY`

`ENCRYPTION_KEY` must be valid according to the runtime validation rules:

- either 64 hexadecimal characters
- or 32 UTF-8 characters

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` to match your local setup.

## Running the Service

### Development

```bash
cd backend
npm run dev
```

### Production build

```bash
cd backend
npm run build
npm run start
```

Default local endpoints:

- API root: `http://localhost:3000/api`
- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`

## Database and Seed Workflow

Run migrations:

```bash
cd backend
npm run migrate
```

Seed the database:

```bash
cd backend
npm run seed
```

The seed script is designed to be idempotent so it can be rerun during local setup without duplicating the same records.

Migration generation:

```bash
cd backend
npm run migrate:generate -- <migration-name>
```

## Docker

The backend is usually run with the root Compose file:

- [docker-compose.yml](E:\08%20-%20Hell%20Authenticator\docker-compose.yml)

To start the full local stack:

```bash
cd ..
docker compose up -d postgres redis localstack backend
```

To watch backend logs:

```bash
docker compose logs -f backend
```

To rebuild the backend container:

```bash
docker compose up -d --build backend
```

Package-local Docker scripts:

```bash
cd backend
npm run docker:build
npm run docker:run
```

## Cloud Backup Providers

The backend can expose real cloud backup integrations for:

- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Dropbox
- OneDrive
- Google Drive

Provider availability is environment-driven. A provider appears as connected only when its required variables are configured in [backend/.env.example](E:\08%20-%20Hell%20Authenticator\backend\.env.example) or your local `backend/.env`.

For a complete setup and validation guide, see:

- [backend/docs/cloud-backup-validation.md](E:\08%20-%20Hell%20Authenticator\backend\docs\cloud-backup-validation.md)

## API Surface

Current route groups include:

- `/api/auth`
- `/api/accounts`
- `/api/backup`
- `/health`
- `/docs`

Examples:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/accounts`
- `POST /api/backup`

## Security Notes

The backend includes:

- password hashing with bcrypt
- JWT access and refresh tokens
- Redis-backed session control
- refresh token rotation
- Fastify schema validation
- Helmet security headers
- rate limiting
- encrypted handling for sensitive account and backup data

Operational rule of thumb:

- do not log passwords
- do not log tokens
- do not log encryption secrets

## Scripts

Available `package.json` scripts:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run lint`
- `npm run lint:fix`
- `npm run type-check`
- `npm run migrate`
- `npm run migrate:generate`
- `npm run seed`
- `npm run docker:build`
- `npm run docker:run`

## Testing

Run the full backend validation set:

```bash
cd backend
npm run lint
npm run type-check
npm test
```

Coverage:

```bash
cd backend
npm run test:coverage
```

## Observability

The backend exposes:

- `GET /health`
- `GET /docs`
- Prometheus metrics when enabled

The root Docker Compose can also start:

- Prometheus
- Grafana

using the `observability` profile.

## Troubleshooting

### `Cannot create a "default" connection because connection to the database already established`

This was addressed by making database initialization idempotent in the backend configuration. If you still see it, restart the backend service after pulling the latest code.

### `ENCRYPTION_KEY must be 64-char hex or 32-char UTF-8 string`

Fix the value in `.env` and restart the backend container or dev server.

### Migrations fail because helper scripts are treated as migrations

Only files matching the migration naming pattern should be loaded. Make sure you are running the latest backend configuration and keep helper scripts outside the migration glob.

### Seed works inconsistently

Use the latest `seed.ts` implementation and rerun `npm run seed`. The current seed is intended to be safe to rerun during local development.
