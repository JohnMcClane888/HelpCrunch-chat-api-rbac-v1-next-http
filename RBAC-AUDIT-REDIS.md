# Production RBAC audit + Redis invalidation

RBAC management mutations now create audit records:

- ROLE_CREATED
- ROLE_UPDATED
- ROLE_ASSIGNED
- ROLE_REMOVED
- ROLE_PERMISSIONS_REPLACED

Audit records store the actor in `userId` and RBAC target details in `metadata`.
Request IP and user-agent are also captured when available.

Redis invalidation:
- Shared permission cache key: `authz:permissions:<userId>`
- TTL: 30 seconds
- Mutation deletes the shared key and publishes `authorization:invalidate`.
- Every NestJS instance starts a dedicated Redis subscriber.
- Subscribers remove the affected user from their local in-process cache.

Run:

```powershell
npx prisma generate
npx prisma migrate dev --name audit_rbac_changes
npm run prisma:seed
npx tsc --noEmit
npm run build
```

Production note:
For strong audit durability, an outbox/transactional event pattern is preferable when audit persistence must be guaranteed atomically with the RBAC mutation. The current implementation records the audit after the successful database mutation and surfaces audit-write failures to the caller.
