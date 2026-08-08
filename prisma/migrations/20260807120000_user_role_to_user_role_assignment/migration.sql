-- Migrate the legacy User.role enum to the normalized UserRole assignment table.
-- This migration is intentionally data-preserving and idempotent for role rows.

INSERT INTO "roles" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
  (md5('rbac-user-role'), 'USER', 'Default user role', NOW(), NOW()),
  (md5('rbac-agent-role'), 'AGENT', 'Agent role', NOW(), NOW()),
  (md5('rbac-admin-role'), 'ADMIN', 'Administrator role', NOW(), NOW()),
  (md5('rbac-owner-role'), 'OWNER', 'Owner role', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "user_roles" ("userId", "roleId", "createdAt")
SELECT u."id", r."id", NOW()
FROM "users" u
JOIN "roles" r ON r."name" = u."role"::text
ON CONFLICT ("userId", "roleId") DO NOTHING;

ALTER TABLE "users" DROP COLUMN "role";

DROP TYPE "UserRole";
