# RBAC verification (Windows / PowerShell)

## 1. Start infrastructure

```powershell
docker compose up -d
docker compose ps
```

PostgreSQL must be `healthy` on `localhost:5432` and Redis on `localhost:6379`.

## 2. Install and generate Prisma

```powershell
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma validate
```

The project is pinned to Prisma `6.19.3`. Do not upgrade to Prisma 7 for this revision.

## 3. Apply migrations and seed RBAC

```powershell
npx.cmd prisma migrate deploy
.\BOOTSTRAP-ADMIN.ps1 -Email "test@example.com"
```

`RBAC_BOOTSTRAP_ADMIN_EMAIL` is optional and intended for local/dev verification. When set, the seed assigns the existing user to `ADMIN`, which provides `authorization:manage`. Do not set it to a real production user unless that elevation is intentional.

The seed creates/updates permissions and assigns the default permission matrix:

- `USER`: chat/ticket/contact basic permissions
- `AGENT`: user read + basic agent permissions
- `ADMIN`: all permissions
- `OWNER`: all permissions

## 4. Register and verify a user

```powershell
$body = @{
  username = "testuser"
  email    = "test@example.com"
  password = "Test123!"
} | ConvertTo-Json

$result = Invoke-RestMethod `
  -Uri "http://localhost:3000/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

$result | ConvertTo-Json -Depth 10
```

Registration intentionally returns `emailVerificationRequired: true`.
For local testing, set `emailVerified = true` for the test user in Prisma Studio.

## 5. Login

```powershell
$loginBody = @{
  email    = "test@example.com"
  password = "Test123!"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{
  Authorization = "Bearer $($login.accessToken)"
}

$login | ConvertTo-Json -Depth 10
```

## 6. Check the current user's RBAC state

This endpoint only requires authentication. It does **not** require `user:read`.

```powershell
$mePermissions = Invoke-RestMethod `
  -Uri "http://localhost:3000/authorization/me/permissions" `
  -Method Get `
  -Headers $headers

$mePermissions | ConvertTo-Json -Depth 10
```

Expected shape:

```json
{
  "userId": "...",
  "roles": ["USER"],
  "permissions": ["chat:create", "chat:read", "contact:read", "ticket:create", "ticket:read"]
}
```

If the array is empty, run `npm.cmd run prisma:seed:rbac` and retry.

## 7. Check admin authorization

A normal `USER` must receive `403 Insufficient permissions` here. That is correct:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/admin/authorization/roles" `
  -Method Get `
  -Headers $headers
```

For local testing, use `BOOTSTRAP-ADMIN.ps1`. Perform a **new login** after seeding so the fresh access token/session sees the new role.

If you prefer manual assignment, use Prisma Studio (`UserRole`) instead. After either method, the same request should return the roles list.

## 8. Important PowerShell detail

Do not append text to a command accidentally. This is wrong:

```powershell
$result | ConvertTo-Json -Depth 10$result
```

Use:

```powershell
$result | ConvertTo-Json -Depth 10
```

## 9. Prisma Studio on Windows

Prisma Studio is a separate Node process. Start it with:

```powershell
npx.cmd prisma studio --port 5555
```

Keep that terminal open while using `http://localhost:5555`. If Windows reports that Prisma/Node files are locked, stop Node processes first (`taskkill /F /IM node.exe`) and then retry.
