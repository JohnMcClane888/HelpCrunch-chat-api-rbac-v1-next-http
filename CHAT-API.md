# Chat API — first vertical slice

The chat module is deliberately implemented in two layers:

1. **RBAC guard** checks the endpoint permission (`chat:*`).
2. **ChatService** performs resource-level authorization (participant/creator/privileged role checks).

This follows NestJS's recommended separation between route authorization and business-logic/resource authorization. See the official NestJS authorization guidance: https://docs.nestjs.com/security/authorization

## Endpoints

All endpoints below require a valid access JWT.

| Method | Route | Permission | Resource rule |
|---|---|---|---|
| POST | `/chat/conversations` | `chat:create` | authenticated user becomes first participant |
| GET | `/chat/conversations` | `chat:read` | USER sees own/participating chats; AGENT/ADMIN/OWNER see all |
| GET | `/chat/conversations/:conversationId` | `chat:read` | participant or AGENT/ADMIN/OWNER |
| POST | `/chat/conversations/:conversationId/participants` | `chat:update` | creator or AGENT/ADMIN/OWNER |
| POST | `/chat/conversations/:conversationId/messages` | `chat:create` | active participant; conversation must be open |
| PATCH | `/chat/conversations/:conversationId/close` | `chat:update` | creator or AGENT/ADMIN/OWNER |
| DELETE | `/chat/conversations/:conversationId` | `chat:delete` | creator or AGENT/ADMIN/OWNER |

Message listing is currently returned with a conversation (`GET /chat/conversations/:conversationId`) and capped at 100 messages for the initial slice.

## Validation

- Conversation subject: optional, 1–255 characters.
- Participant user ID: UUID.
- Message body: 1–10,000 characters.
- Conversation IDs are validated as UUIDs by Nest's `ParseUUIDPipe`.

## Deliberate security boundaries

- A user cannot read a conversation merely because they know its UUID.
- A user cannot send a message unless they are an active participant.
- Closed conversations reject new messages.
- Creator/resource checks remain in the service even though endpoint permissions are enforced by `PermissionsGuard`.
- No `admin:*` shortcut is hard-coded into the chat module; privileged access is based on the existing RBAC role assignments (`AGENT`, `ADMIN`, `OWNER`).
