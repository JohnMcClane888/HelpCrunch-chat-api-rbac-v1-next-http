# User.role -> UserRole migration

This migration runs after the initial legacy schema migration.

It:

1. Creates the canonical USER/AGENT/ADMIN/OWNER role records if they do not exist.
2. Backfills every legacy `users.role` value into `user_roles`.
3. Removes the legacy `users.role` column.
4. Removes the legacy `UserRole` PostgreSQL enum.

For a fresh local database, apply migrations in order with:

```bash
npx prisma migrate deploy
```

For an existing production database that was created outside Prisma migrations, do **not** run this migration blindly. First baseline/resolve the existing schema with a verified backup and deployment plan.
