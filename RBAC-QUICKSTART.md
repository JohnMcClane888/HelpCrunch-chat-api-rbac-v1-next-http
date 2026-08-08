# RBAC local quick start (Windows)

This project intentionally distinguishes authentication from authorization:

- `GET /authorization/me/permissions` requires a valid access token only.
- `GET /admin/authorization/roles` requires the `authorization:manage` permission.
- A user with role `USER` is expected to receive `403 Insufficient permissions` from admin endpoints.

## One-command local setup

From the project directory (the directory containing `package.json`), run:

```powershell
.\SETUP-LOCAL.ps1
```

For a different existing bootstrap user:

```powershell
.\SETUP-LOCAL.ps1 -Email "admin@example.com"
```

The script installs dependencies, generates Prisma Client, builds Nest, seeds RBAC, and assigns `ADMIN` to the selected local user.

## Clean local verification

Run from the project directory (the directory containing `package.json`):

```powershell
npm.cmd install
npx.cmd prisma generate
npm.cmd run build
npm.cmd run start
```

Keep the Nest process running.

## Create a local test user

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

Registration intentionally requires email verification. In local development, set `emailVerified = true` for the test user in Prisma Studio or directly in the database.

## Login as USER

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

$headers = @{ Authorization = "Bearer $($login.accessToken)" }
```

Check the user's effective RBAC state:

```powershell
$mePermissions = Invoke-RestMethod `
  -Uri "http://localhost:3000/authorization/me/permissions" `
  -Method Get `
  -Headers $headers

$mePermissions | ConvertTo-Json -Depth 10
```

Expected for a new user:

```text
roles: USER
permissions: chat:create, chat:read, contact:read, ticket:create, ticket:read
```

This proves authentication and normal-user authorization are working.

## Make the local test user ADMIN

For local development, the RBAC seed defaults to `test@example.com` as the bootstrap admin when `NODE_ENV` is not `production`. You can simply run:

```powershell
.\BOOTSTRAP-ADMIN.ps1
```

Or choose another existing user explicitly:

```powershell
.\BOOTSTRAP-ADMIN.ps1 -Email "admin@example.com"
```

The production path is safe: the automatic `test@example.com` fallback is disabled when `NODE_ENV=production`.

If you prefer not to use the helper, run the seed from the project directory after setting `RBAC_BOOTSTRAP_ADMIN_EMAIL` in the current PowerShell process.

The script uses `RBAC_BOOTSTRAP_ADMIN_EMAIL` only for the seed operation and does not put the setting into source code.

Then **log in again** to get a fresh token:

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

$headers = @{ Authorization = "Bearer $($login.accessToken)" }
```

Verify:

```powershell
$mePermissions = Invoke-RestMethod `
  -Uri "http://localhost:3000/authorization/me/permissions" `
  -Method Get `
  -Headers $headers

$mePermissions | ConvertTo-Json -Depth 10
```

The `roles` array must now contain `ADMIN`, and the permissions must include `authorization:manage`.

Finally:

```powershell
$roles = Invoke-RestMethod `
  -Uri "http://localhost:3000/admin/authorization/roles" `
  -Method Get `
  -Headers $headers

$roles | ConvertTo-Json -Depth 10
```

This request should now return the role list instead of `403`.

## If `/authorization/me/permissions` returns 401

Your `$headers` variable is missing, stale, or contains an expired/revoked token. Always recreate it immediately after login:

```powershell
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
```

## If `/admin/authorization/roles` returns 403

That is expected when the current user does not have `authorization:manage`.

Do not disable `PermissionsGuard` and do not make admin routes public. Assign `ADMIN` to the intended local test user and log in again.

## Prisma Studio

Start it in a separate terminal:

```powershell
npx.cmd prisma studio --port 5555
```

Keep that terminal open. If port 5555 is already occupied, find the process:

```powershell
netstat -ano | findstr ":5555"
```

Then stop the corresponding Node process if it is a stale Prisma Studio process.

## Windows locked `node_modules`

If Prisma/argon2 DLLs are locked:

```powershell
tasklist | findstr /I "node prisma"
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .\node_modules
npm.cmd install
npx.cmd prisma generate
```

Do not type error-message text such as `Access to the path ... is denied` as a command; that text is output from PowerShell, not a command.
