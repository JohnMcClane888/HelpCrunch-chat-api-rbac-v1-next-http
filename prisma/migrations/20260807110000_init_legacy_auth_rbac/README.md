# Initial legacy auth + RBAC schema

Creates the complete initial database schema, including the legacy `users.role` enum column.
The next migration backfills that column into `user_roles` and removes the legacy enum/column.
