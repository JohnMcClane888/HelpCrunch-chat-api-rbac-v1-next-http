# Database-backed RBAC

The authorization policy is now stored in PostgreSQL:

User -> UserRole -> Role -> RolePermission -> Permission

Runtime request flow:

JWT -> PermissionsGuard -> AuthorizationService -> AuthorizationCache -> PermissionRepository -> PostgreSQL

Cache:
- process-local TTL: 30 seconds
- bounded to 10,000 users
- invalidated explicitly by `AuthorizationService.invalidateUser(userId)`

Seed:
```powershell
npm run prisma:seed
```

Validation:
```powershell
npx prisma generate
npx prisma validate
npx tsc --noEmit
npm run build
```

Important:
- `UserRole` is the single source of truth for user-to-role assignments.
- The legacy `User.role` enum is removed by the production migration and is not used by authentication or authorization.
- Access tokens carry identity/session claims, while effective roles and permissions are resolved from `UserRole` and `RolePermission`.
- When role assignments change, invalidate the affected user's cache.
- For multi-instance production deployments, replace the local cache with Redis (or add pub/sub invalidation) so all API instances observe permission changes promptly.
