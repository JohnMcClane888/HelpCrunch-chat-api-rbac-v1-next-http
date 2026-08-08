# RBAC Management + Redis verification

Static verification: PASS

Behavioral note: `GET /authorization/me/permissions` is an authenticated self-service endpoint and does not require `user:read`. Management routes under `/admin/authorization` still require `authorization:manage`; a normal USER should receive HTTP 403 there.

- Role management service/controller added.
- Permission listing and role-permission replacement added.
- User role assignment/removal added.
- Effective permission inspection added.
- `authorization:manage` permission added for management endpoints.
- Management routes are protected by `@Permissions(...)`.
- Redis module/service added.
- Authorization cache uses Redis with 30-second TTL and local fallback.
- Cache invalidation deletes the shared Redis key.
- A Redis invalidation event is published for multi-instance subscribers.
- `redis` dependency added.

Run locally:

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name rbac_management
npm run prisma:seed
npx prisma validate
npx tsc --noEmit
npm run build
```

Production requirements:
1. Set `REDIS_URL`.
2. Run Redis.
3. Run Prisma migrations.
4. Seed `authorization:manage`.
5. Ensure only ADMIN/OWNER users receive that permission.
6. For multiple API instances, add a Redis subscriber that consumes `authorization:invalidate` and clears each instance's local cache.
7. Add audit events for role/permission changes before exposing this API to operators.
