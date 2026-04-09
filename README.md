# Hell Authenticator

Hell Authenticator is a monorepo for a mobile-first two-factor authentication platform. It includes a Fastify backend API, a React Native mobile application, local infrastructure with Docker Compose, and supporting developer tooling for Android development and automated testing.

## Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker)
- [Running the Backend Locally](#running-the-backend-locally)
- [Running the Frontend Locally](#running-the-frontend-locally)
- [Testing and Quality Checks](#testing-and-quality-checks)
- [Environment and Configuration](#environment-and-configuration)
- [Troubleshooting](#troubleshooting)
- [Repository Conventions](#repository-conventions)

## Overview

The project is split into two main applications:

- `backend`: a Fastify + TypeScript API that handles authentication, account management, backup flows, session management, and infrastructure integrations such as Redis and LocalStack.
- `frontend`: a React Native + TypeScript app for Android development, account management, and mobile authentication flows.

This repository is intended to support local development with Docker-backed infrastructure, mobile debugging through Metro, and automated validation with linting, type checking, unit tests, and Detox-based Android end-to-end tests.

## Monorepo Structure

```text
.
├── backend/               # Fastify API, database access, auth, services, scripts
├── frontend/              # React Native mobile app
├── docker-compose.yml     # Local infrastructure and backend stack
├── AGENTS.md              # Repo-level coding instructions for agents
├── AGENTS.backend.md      # Backend-specific guidance
└── AGENTS.frontend.md     # Frontend-specific guidance
```

Key paths:

- [backend/src/app.ts](E:\08%20-%20Hell%20Authenticator\backend\src\app.ts)
- [backend/src/routes](E:\08%20-%20Hell%20Authenticator\backend\src\routes)
- [backend/src/services](E:\08%20-%20Hell%20Authenticator\backend\src\services)
- [frontend/App.tsx](E:\08%20-%20Hell%20Authenticator\frontend\App.tsx)
- [frontend/src/navigation](E:\08%20-%20Hell%20Authenticator\frontend\src\navigation)
- [frontend/src/screens](E:\08%20-%20Hell%20Authenticator\frontend\src\screens)
- [docker-compose.yml](E:\08%20-%20Hell%20Authenticator\docker-compose.yml)

## Technology Stack

### Backend

- Node.js 18+
- Fastify
- TypeScript
- TypeORM
- PostgreSQL
- Redis
- JWT authentication
- Winston logging
- Prometheus metrics

### Frontend

- React Native 0.81
- React 19
- TypeScript
- Redux Toolkit
- React Navigation
- TanStack Query
- Axios
- Metro bundler
- Detox for Android end-to-end tests

### Local Infrastructure

- Docker Compose
- PostgreSQL 15
- Redis 7
- LocalStack
- Adminer
- Redis Commander
- Optional Prometheus and Grafana via Compose profiles

## Prerequisites

Before working in the repository, make sure you have:

- Node.js `>= 18`
- npm `>= 8`
- Docker Desktop
- Android SDK and an Android emulator for mobile development
- PowerShell available on Windows

Recommended:

- Git for Windows
- A running Android emulator before executing the frontend Android scripts

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Prepare backend environment

Copy the backend example environment file:

```bash
cd backend
cp .env.example .env
```

Then update the values in `.env` as needed. Pay special attention to:

- `DB_*`
- `REDIS_*`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

`ENCRYPTION_KEY` must be either:

- a 64-character hex string, or
- a 32-character UTF-8 string

### 3. Start infrastructure

From the repository root:

```bash
docker compose up -d postgres redis localstack adminer redis-commander backend
```

If you also want observability services:

```bash
docker compose --profile observability up -d prometheus grafana
```

### 4. Run database migrations and seed data

If the backend container is already running, you can run scripts from the backend package locally:

```bash
cd backend
npm run migrate
npm run seed
```

## Running with Docker

The root Compose file provisions the main local development stack:

- `postgres`
- `redis`
- `localstack`
- `backend`
- `adminer`
- `redis-commander`
- `prometheus` and `grafana` behind the `observability` profile

Default exposed ports are controlled by environment variables. Important defaults in practice:

- Backend API: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
- LocalStack: `4566`
- Adminer: `8080`
- Redis Commander: configurable, often moved away from `8081` to avoid conflict with Metro

Useful commands:

```bash
docker compose up -d
docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose down
```

## Running the Backend Locally

Backend package commands:

```bash
cd backend
npm run dev
npm run build
npm run start
npm run migrate
npm run seed
```

The backend is expected to be available at:

- API base: `http://localhost:3000/api`
- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`

## Running the Frontend Locally

The current repository is set up primarily for Android development.

### Recommended debug workflow

Use the live Metro workflow during development instead of a bundled APK:

Terminal 1:

```bash
cd frontend
npm run start
```

Terminal 2:

```bash
cd frontend
npm run android
```

If the app is already installed and you only want to relaunch it:

```bash
cd frontend
npm run android:open
```

This setup gives you:

- live Metro bundling
- hot reload / fast refresh
- backend access from the emulator through `http://10.0.2.2:3000/api`
- `adb reverse` for Metro on port `8081`

### Bundled Android build

If you want to run without Metro:

```bash
cd frontend
npm run android:bundled
```

Use this only when you explicitly want a packaged JS bundle inside the APK. For day-to-day development, prefer the debug workflow above.

## Testing and Quality Checks

### Backend

```bash
cd backend
npm run lint
npm run type-check
npm test
npm run test:coverage
```

### Frontend

```bash
cd frontend
npm run lint
npm run type-check
npm test
npm run test:coverage
```

### Frontend E2E

```bash
cd frontend
npm run e2e:prepare
npm run e2e:build
npm run e2e:test
```

## Environment and Configuration

### Backend environment

The backend environment file lives at:

- [backend/.env.example](E:\08%20-%20Hell%20Authenticator\backend\.env.example)

It controls:

- server host and port
- PostgreSQL connection
- Redis connection
- JWT secrets and expiration
- encryption key
- AWS / LocalStack settings
- Prometheus metrics
- logging
- CORS allowlist

### Frontend runtime behavior

The frontend API base URL is selected in:

- [frontend/src/services/api.ts](E:\08%20-%20Hell%20Authenticator\frontend\src\services\api.ts)

Current behavior:

- Android debug/emulator uses `http://10.0.2.2:3000/api`
- local iOS/dev fallback uses `http://localhost:3000/api`
- production fallback points to the remote API host defined in code

## Troubleshooting

### The app cannot connect to Metro

Make sure:

- Metro is running on port `8081`
- `redis-commander` or another process is not occupying `8081`
- `adb reverse tcp:8081 tcp:8081` has been applied

If needed:

```bash
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
```

### The Android app shows an invalid DevTools URL

If DevTools opens `0.0.0.0:8081`, stop all Metro processes and restart Metro so it binds to `127.0.0.1:8081`.

### The backend refuses to start because of `ENCRYPTION_KEY`

Use a valid key format:

- 64-char hex string, or
- 32-char plain UTF-8 string

### Login reaches the backend but the app stays on the splash screen

The frontend auth bootstrap should only control the splash during session initialization. If you still see looping behavior, restart Metro and reload the app to ensure the latest auth context changes are loaded.

## Repository Conventions

- Use semantic commits.
- Prefer minimal, testable changes.
- Validate the affected package with lint, type-check, and relevant tests.
- Do not commit secrets or local machine credentials.
- Follow [AGENTS.md](E:\08%20-%20Hell%20Authenticator\AGENTS.md), [AGENTS.backend.md](E:\08%20-%20Hell%20Authenticator\AGENTS.backend.md), and [AGENTS.frontend.md](E:\08%20-%20Hell%20Authenticator\AGENTS.frontend.md) when contributing through an agent workflow.

## Package READMEs

For package-level details, see:

- [backend/README.md](E:\08%20-%20Hell%20Authenticator\backend\README.md)
- [frontend/README.md](E:\08%20-%20Hell%20Authenticator\frontend\README.md)
