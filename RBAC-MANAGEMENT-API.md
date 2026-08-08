# RBAC Management API

Management routes require authentication plus `authorization:manage`. A normal `USER` therefore receives `403 Insufficient permissions` from these routes by design.

## Self-service authorization

GET `/authorization/me/permissions`

Requires a valid access token only. Returns the authenticated user's effective roles and permissions. It does not require `user:read`.

## Roles

GET `/admin/authorization/roles`
POST `/admin/authorization/roles`
PATCH `/admin/authorization/roles/:roleId`

## Permissions

GET `/admin/authorization/permissions`
PUT `/admin/authorization/roles/:roleId/permissions`

## User role assignments

GET `/admin/authorization/users/:userId/roles`
POST `/admin/authorization/users/:userId/roles`
DELETE `/admin/authorization/users/:userId/roles/:roleName`

## Effective permissions

GET `/admin/authorization/users/:userId/permissions`

Role and permission changes invalidate the affected user's cache.

Redis:
- key prefix: `authz:permissions:`
- TTL: 30 seconds
- invalidation channel: `authorization:invalidate`
- local cache is used when Redis is unavailable.

For multi-instance deployments, use a Redis subscriber/worker to consume `authorization:invalidate` and clear local entries on every instance. The API deletes the shared Redis key immediately, so stale shared cache entries are not intentionally retained.
