# HelpCrunch RBAC v9 fixes

## What was verified/fixed

1. Kept `GET /authorization/me/permissions` authentication-only. A normal authenticated `USER` can inspect their own effective roles and permissions.
2. Kept admin authorization protected by `authorization:manage`. A normal `USER` receiving `403 Insufficient permissions` from `/admin/authorization/roles` is correct RBAC behavior.
3. Added a safer, validated `BOOTSTRAP-ADMIN.ps1` helper for local development. It assigns `ADMIN` through the existing Prisma seed flow and explicitly tells the operator to obtain a fresh JWT.
4. Added `RBAC-QUICKSTART.md` with exact Windows commands for install, build, login, permission inspection, admin bootstrap, Prisma Studio, and locked-node_modules recovery.
5. Updated `RBAC-VERIFICATION.md` to use the bootstrap helper instead of requiring manual environment-variable setup.

## Important

Do not remove `PermissionsGuard` or make `/admin/authorization/*` public just to make the admin request return 200. The observed `403` for a `USER` account is an authorization result, not a broken authentication flow.

6. Made the local bootstrap deterministic: outside production, the RBAC seed uses `test@example.com` as the default bootstrap admin when no explicit `RBAC_BOOTSTRAP_ADMIN_EMAIL` is supplied. Production keeps the fallback disabled.
7. Simplified `BOOTSTRAP-ADMIN.ps1` so `./BOOTSTRAP-ADMIN.ps1` works for the standard local test account, while `-Email` remains available for another existing user.
