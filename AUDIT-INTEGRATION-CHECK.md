# Audit integration check

Run from the project root:

```powershell
npm install
npx prisma generate
npx prisma validate
npx tsc --noEmit
```

Then start the API:

```powershell
npm run start:dev
```

Verify these flows:

- failed login -> `LOGIN_FAILED`
- successful login -> `LOGIN_SUCCESS` + `SESSION_CREATED`
- logout -> `LOGOUT` + `SESSION_REVOKED`
- successful refresh -> `REFRESH_SUCCESS`
- reused refresh token -> `REFRESH_REUSE_DETECTED` and session `COMPROMISED`

Never put raw access tokens, refresh tokens, passwords, or password hashes into audit metadata.
