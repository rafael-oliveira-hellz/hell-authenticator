# Hell Authenticator Frontend

The frontend package contains the Hell Authenticator mobile application built with React Native and TypeScript. The current local development workflow is centered on Android emulator development with Metro and a Docker-backed backend running on port `3000`.

## Contents

- [Overview](#overview)
- [Stack](#stack)
- [Project Layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Workflow](#development-workflow)
- [Android Commands](#android-commands)
- [Backend Integration](#backend-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Notes for Contributors](#notes-for-contributors)

## Overview

This package provides the mobile UI for:

- registration and login
- session-aware app bootstrap
- account listing and TOTP flows
- backup and restore screens
- settings and user preferences
- Android debug and bundled build flows

Main entry points:

- [App.tsx](E:\08%20-%20Hell%20Authenticator\frontend\App.tsx)
- [index.js](E:\08%20-%20Hell%20Authenticator\frontend\index.js)
- [app.json](E:\08%20-%20Hell%20Authenticator\frontend\app.json)

## Stack

- React Native `0.81`
- React `19`
- TypeScript
- Redux Toolkit
- React Navigation
- TanStack Query
- Axios
- Metro
- Jest
- Detox

## Project Layout

```text
frontend/
├── android/
├── e2e/
├── scripts/
├── src/
│   ├── components/
│   ├── constants/
│   ├── contexts/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── App.tsx
├── app.json
├── babel.config.js
├── index.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

Important paths:

- [src/navigation/AppNavigator.tsx](E:\08%20-%20Hell%20Authenticator\frontend\src\navigation\AppNavigator.tsx)
- [src/contexts/AuthContext.tsx](E:\08%20-%20Hell%20Authenticator\frontend\src\contexts\AuthContext.tsx)
- [src/services/api.ts](E:\08%20-%20Hell%20Authenticator\frontend\src\services\api.ts)
- [src/store/slices/authSlice.ts](E:\08%20-%20Hell%20Authenticator\frontend\src\store\slices\authSlice.ts)
- [scripts/start-metro.ps1](E:\08%20-%20Hell%20Authenticator\frontend\scripts\start-metro.ps1)
- [scripts/run-android-app.ps1](E:\08%20-%20Hell%20Authenticator\frontend\scripts\run-android-app.ps1)

## Prerequisites

- Node.js `>= 18`
- npm `>= 8`
- Android SDK
- At least one Android emulator
- PowerShell on Windows

Notes:

- The repository currently does not include an `ios/` folder, so local development is effectively Android-first.
- Metro uses port `8081`.

## Installation

```bash
cd frontend
npm install
```

If needed for E2E support:

```bash
cd frontend
npm run e2e:prepare
```

## Development Workflow

### Recommended workflow: debug + Metro

This is the preferred local workflow because it supports fast reload without rebuilding the app for every JavaScript or TypeScript change.

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

After the app is already installed, you can reopen it without rebuilding:

```bash
cd frontend
npm run android:open
```

In this workflow:

- Metro runs on `127.0.0.1:8081`
- Android uses `adb reverse` for Metro
- the emulator calls the backend through `http://10.0.2.2:3000/api`
- most JS and TS edits only require reload, not rebuild

### Bundled Android workflow

Use this only when you need an APK with the JavaScript bundle embedded:

```bash
cd frontend
npm run android:bundled
```

This mode is slower for development because JavaScript changes require rebuilding the app.

## Android Commands

Available scripts:

- `npm run start`
- `npm run android`
- `npm run android:open`
- `npm run android:bundled`
- `npm run ios`
- `npm run clean`
- `npm run e2e:bootstrap`
- `npm run e2e:build`
- `npm run e2e:test`

What each one does:

- `start`: starts Metro through the PowerShell wrapper
- `android`: prepares `adb reverse` and installs/runs the debug app
- `android:open`: relaunches the already installed Android app
- `android:bundled`: builds and installs an Android app with an embedded JS bundle

## Backend Integration

Frontend API access is configured in:

- [src/services/api.ts](E:\08%20-%20Hell%20Authenticator\frontend\src\services\api.ts)

Current expected local backend:

- backend health: `http://localhost:3000/health`
- Android emulator API base: `http://10.0.2.2:3000/api`

This means the backend should be running before you test login, registration, account screens, or backup flows.

## Testing

Lint:

```bash
cd frontend
npm run lint
```

Type checking:

```bash
cd frontend
npm run type-check
```

Unit tests:

```bash
cd frontend
npm test
```

Coverage:

```bash
cd frontend
npm run test:coverage
```

Detox:

```bash
cd frontend
npm run e2e:prepare
npm run e2e:build
npm run e2e:test
```

## Troubleshooting

### Metro is running but the app cannot load the bundle

Check:

- Metro is on port `8081`
- no Docker service is using `8081`
- `adb reverse tcp:8081 tcp:8081` is active

### DevTools opens `0.0.0.0:8081`

Stop all Metro processes and restart Metro so it binds to `127.0.0.1:8081`.

If needed:

```bash
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
```

### The app stays on the splash screen after login

The auth bootstrap and splash gating should only apply during initialization, not during every login mutation. If you still see this after pulling the latest changes, restart Metro and reload the app so the latest auth state logic is in memory.

### Registration or login reaches the backend but the error message is not shown correctly

The auth screens now normalize both `Error` objects and plain string payloads. Reload the app through Metro so the latest screen code is used.

### Do I need to rebuild after every change?

Not when you are using the debug + Metro workflow. Rebuild is only needed when you change native Android code, native dependencies, or deliberately use the bundled APK path.

## Notes for Contributors

- Prefer the debug + Metro workflow for daily development.
- Keep the backend running on port `3000` to match the frontend default Android config.
- Validate auth changes carefully because the app bootstrap, Redux auth state, and navigation all interact closely.
- When changing request or response contracts, verify both the backend route and the frontend API wrapper.
