# Chat API — HTTP/RBAC vertical slice

The archive already had most of the requested wiring in place:

- `ChatModule` was already imported by `AppModule`.
- `ChatController` already exposed real HTTP endpoints.
- `PermissionsGuard` was already applied to chat routes.
- DTOs and global `ValidationPipe` were already configured.

This step makes the HTTP boundary consistent with the existing security layer and adds e2e coverage.

## Changes

1. `ChatController` now uses the existing `JwtAuthGuard` instead of constructing a second `AuthGuard('jwt')` directly.
2. `DELETE /chat/conversations/:conversationId` now returns HTTP `204 No Content` and no response body.
3. Added `test/chat.e2e-spec.ts` covering:
   - `401` without an access JWT;
   - `403` with a valid JWT but without `chat:read`;
   - `200` for an authorized list request;
   - `201` for conversation creation;
   - `400` for invalid DTO input;
   - `204` for authorized deletion.
4. Added `supertest` and `@types/supertest` as development dependencies.
5. Added `test/jest-e2e.json`.

## Run locally on Windows

From the project root:

```powershell
npm.cmd install
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

TypeScript check:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

The e2e suite uses `AppModule`, the real `JwtAuthGuard`, the real `PermissionsGuard`, the real controller and global validation. Database/Redis/identity/chat providers are replaced with test doubles so the HTTP security contract can be tested without requiring PostgreSQL or Redis.
