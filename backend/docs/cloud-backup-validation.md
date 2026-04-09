# Cloud Backup Validation

This guide reflects the current product direction of Hell Authenticator:

- the app exposes a single internal cloud backup destination backed by backend infrastructure
- the only user-owned cloud connection currently supported is Google Drive

## Supported Flows

### 1. App internal cloud
The mobile app shows this simply as `Backup em nuvem`.
The backend currently validates and operates against the internal provider catalog, but the user does not choose infrastructure details in the app.

### 2. User-owned Google Drive connection
The user can connect their own Google Drive account from the app and store backups under their own Drive access after completing OAuth.

## Environment Setup

Start from [backend/.env.example](E:\08%20-%20Hell%20Authenticator\backend\.env.example) and copy it to `backend/.env`.

### Internal cloud validation
The backend still supports internal provider verification for these storage adapters:

- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Google Drive

The mobile app only depends on the internal cloud provider returned by `GET /api/backup/providers`.

### Google Drive OAuth for user-owned storage
Required variables:

```env
GOOGLE_DRIVE_OAUTH_CLIENT_ID=
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=
GOOGLE_DRIVE_OAUTH_REDIRECT_URI=
```

Recommended redirect URI pattern:

```text
https://YOUR-TUNNEL/api/backup/user-cloud-connections/oauth/callback
```

## Start the Backend

Local dev:

```bash
cd backend
npm run dev
```

Docker:

```bash
cd E:\08 - Hell Authenticator
docker compose up -d backend
```

Restart the backend whenever you change `backend/.env`.

## Validate Internal Cloud Catalog

After authenticating, call:

```bash
curl -X GET http://localhost:3000/api/backup/providers ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected result:

- the app internal cloud appears as connected only when backend credentials are healthy
- providers missing credentials appear as not configured or verification failed

## Create a Backup Baseline

```bash
curl -X POST http://localhost:3000/api/backup ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -d "{\"description\":\"Smoke backup\",\"type\":\"local\",\"retentionDays\":30}"
```

Save the returned `backup.id`.

## Validate Internal Cloud Upload / Download / Delete

### Upload to app cloud

```bash
curl -X POST http://localhost:3000/api/backup/BACKUP_ID/upload-to-cloud ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -d "{\"cloudProvider\":\"gcp\",\"cloudPath\":\"smoke-tests/internal/backup.enc\"}"
```

### Download from app cloud

```bash
curl -X GET http://localhost:3000/api/backup/BACKUP_ID/download-from-cloud ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Delete backup

```bash
curl -X DELETE http://localhost:3000/api/backup/BACKUP_ID ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Validate Google Drive Connection Through the App

1. Start Metro and the app in debug mode.
2. Open `Backup`.
3. Open `Configurações de nuvem`.
4. Tap `Conectar com Google Drive`.
5. Complete the OAuth flow in the browser.
6. Confirm the app returns automatically to the cloud settings screen.
7. Confirm the connection card shows the connected account.

Expected app behavior:

- success or error alert after the deep link callback
- automatic refetch of providers and connected accounts
- Google Drive shown as connected when the backend stored the connection successfully

## Common Failure Modes

### OAuth starts but callback never returns to the app

Cause:

- Android deep link not installed in the current build
- redirect URI points to a backend URL that is not publicly reachable

Fix:

- make sure the app build includes the `hellauthenticator://backup/cloud-settings` deep link handler
- make sure the backend callback URL is reachable through ngrok or another HTTPS tunnel

### Google Drive OAuth fails immediately

Cause:

- invalid client id or client secret
- redirect URI mismatch between provider console and backend `.env`

Fix:

- compare the provider console redirect URI with `GOOGLE_DRIVE_OAUTH_REDIRECT_URI`
- restart the backend after changing `.env`

### App internal cloud is unavailable

Cause:

- backend internal cloud credentials are missing or unhealthy

Fix:

- validate `GET /api/backup/providers`
- inspect backend logs
- correct internal cloud environment variables
