# Production RBAC matrix

| Permission | USER | AGENT | ADMIN | OWNER |
|---|:---:|:---:|:---:|:---:|
| `USER_READ` | — | ✓ | ✓ | ✓ |
| `USER_CREATE` | — | — | ✓ | ✓ |
| `USER_UPDATE` | — | — | ✓ | ✓ |
| `USER_DELETE` | — | — | ✓ | ✓ |
| `CHAT_READ` | ✓ | ✓ | ✓ | ✓ |
| `CHAT_CREATE` | ✓ | ✓ | ✓ | ✓ |
| `CHAT_UPDATE` | — | — | ✓ | ✓ |
| `CHAT_DELETE` | — | — | ✓ | ✓ |
| `CONTACT_READ` | ✓ | ✓ | ✓ | ✓ |
| `CONTACT_CREATE` | — | — | ✓ | ✓ |
| `CONTACT_UPDATE` | — | — | ✓ | ✓ |
| `CONTACT_DELETE` | — | — | ✓ | ✓ |
| `COMPANY_READ` | — | — | ✓ | ✓ |
| `COMPANY_CREATE` | — | — | ✓ | ✓ |
| `COMPANY_UPDATE` | — | — | ✓ | ✓ |
| `COMPANY_DELETE` | — | — | ✓ | ✓ |
| `TICKET_READ` | ✓ | ✓ | ✓ | ✓ |
| `TICKET_CREATE` | ✓ | ✓ | ✓ | ✓ |
| `TICKET_UPDATE` | — | — | ✓ | ✓ |
| `TICKET_DELETE` | — | — | ✓ | ✓ |
| `SESSION_READ` | — | ✓ | ✓ | ✓ |
| `SESSION_REVOKE` | — | — | ✓ | ✓ |
| `AUDIT_READ` | — | — | ✓ | ✓ |
| `SETTINGS_READ` | — | — | ✓ | ✓ |
| `SETTINGS_UPDATE` | — | — | ✓ | ✓ |
| `ADMIN` | — | — | ✓ | ✓ |

## Enforcement

- `JwtAuthGuard` authenticates the request.
- `PermissionsGuard` enforces `@Permissions(...)` metadata.
- `AuthorizationService` owns the role-to-permission policy.
- `ADMIN` and `OWNER` currently receive every permission defined in `Permission`.
- Do not put raw role checks into controllers; use permissions.
