# RBAC database-backed verification

Static verification: PASS

- Prisma models: Role, Permission, RolePermission, UserRole
- User -> UserRole relation
- RoleRepository
- PermissionRepository
- RepositoryModule exports both repositories
- AuthorizationCache
- AuthorizationService reads effective permissions from DB
- PermissionsGuard checks permissions by authenticated userId
- AuthorizationModule imports RepositoryModule
- RBAC seed script
- package.json seed commands
- 30-second bounded in-process cache

Run locally:

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name add_database_backed_rbac
npm run prisma:seed
npx prisma validate
npx tsc --noEmit
npm run build
```

For production use migrations rather than `db push`.

Functional checks:

1. Assign USER role to a user -> USER permissions work.
2. Assign AGENT role -> agent permissions work.
3. Add ADMIN role -> all defined permissions work.
4. Remove ADMIN role -> cache invalidation must occur before expecting the change.
5. Request a protected endpoint without the required permission -> HTTP 403.
6. Unauthenticated request -> HTTP 401 from authentication guard.
