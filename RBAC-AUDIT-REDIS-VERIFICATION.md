# Verification

Static verification: PASS

Audit:
- AuditAction enum extended with five RBAC actions.
- AuditService exposes dedicated RBAC audit methods.
- AuthorizationManagementService emits audit events for every requested mutation.
- Actor user ID, target identifiers, IP and user-agent are recorded.
- AuthorizationModule imports AuditModule.

Redis:
- RedisService creates a dedicated subscriber connection.
- AuthorizationCache subscribes on module initialization.
- `authorization:invalidate` clears local cache entries on every instance.
- Mutation path deletes the shared Redis key and publishes invalidation.
- Existing TTL remains 30 seconds.

Required runtime verification:

```powershell
npx prisma generate
npx prisma migrate dev --name audit_rbac_changes
npm run prisma:seed
npx tsc --noEmit
npm run build
```

Then verify:
1. Create role -> ROLE_CREATED.
2. Update role -> ROLE_UPDATED.
3. Assign role -> ROLE_ASSIGNED.
4. Remove role -> ROLE_REMOVED.
5. Replace permissions -> ROLE_PERMISSIONS_REPLACED.
6. With two API instances, change a user's role and confirm both instances stop authorizing the old permission after invalidation.
