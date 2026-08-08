# HelpCrunch RBAC v6 fixes

This revision builds on v5 and fixes the remaining RBAC behavior found during local verification.

## Authorization API

- Fixed `GET /authorization/me/permissions`.
- The endpoint now requires authentication only, not `user:read`.
- It returns the authenticated user's `userId`, effective `roles`, and effective `permissions`.
- Permission names are returned as a JSON array rather than a JavaScript `Set`.

## RBAC guards

- `PermissionsGuard` continues to enforce explicit permissions on protected routes.
- `RolesGuard` continues to resolve roles from the normalized `UserRole -> Role` relationship.
- Admin endpoints remain protected by `authorization:manage`.
- Therefore a normal `USER` receiving `403 Insufficient permissions` from `/admin/authorization/roles` is expected behavior, not an authentication failure.

## Local setup

- `.env.example` now matches the credentials used by `docker-compose.yml`.
- Added a complete PowerShell RBAC verification guide in `RBAC-VERIFICATION.md`.
- Prisma remains pinned to `6.19.3`; Prisma 7 is not required for this project revision.

## Existing v5 fixes retained

- Auth result typing fix.
- Authorization cache typing fix.
- Removed obsolete Prisma `$on('beforeExit')` hook.
- NestJS owns application shutdown hooks.
- Prisma and `@prisma/client` are pinned to `6.19.3`.
- Normalized `UserRole` / `Role` / `Permission` / `RolePermission` model is preserved.
