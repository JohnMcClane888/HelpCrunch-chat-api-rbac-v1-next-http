# RBAC migration verification

The migration history is intentionally split into two migrations:

1. `20260807110000_init_legacy_auth_rbac` creates the original schema, including the legacy `users.role` column and the normalized RBAC tables.
2. `20260807120000_user_role_to_user_role_assignment` backfills `users.role` into `user_roles` and removes the legacy enum/column.

This ordering is required for a fresh database. A migration that starts by inserting into `roles` cannot work when `roles` has never been created.

## Fresh local database

Because the previous migration attempt may have left a failed Prisma migration record, reset the disposable local database before retesting:

```powershell
docker compose down -v
docker compose up -d
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run build
```

`docker compose down -v` permanently deletes the local PostgreSQL volume. Never use it against a production database.

## Existing production database

If a production database already contains the legacy schema, do not reset it and do not blindly deploy the initial migration. Baseline the existing schema in Prisma's migration history first, then apply the role backfill migration under a backup and rollback plan.
