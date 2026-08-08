# HelpCrunch(8) — completed auth layer

Added:
- src/app.module.ts
- src/main.ts
- src/auth/auth.module.ts
- src/auth/auth.service.ts
- src/auth/auth.controller.ts
- src/auth/dto/register.dto.ts
- src/auth/dto/login.dto.ts
- src/auth/dto/refresh.dto.ts
- src/auth/dto/index.ts
- src/auth/password/password.service.ts
- src/auth/password/password.module.ts
- src/auth/token/token.service.ts
- src/auth/token/token.module.ts

Corrected:
- IdentityModule now imports RefreshTokenModule.
- Access/Refresh token payload types use JwtTokenType enum members.
- SecurityModule wiring.
- Prisma lifecycle wiring.
- Session constants.
- Refresh strategy cookie/body extraction.

Important integration requirements:
1. Install: @nestjs/jwt @nestjs/passport passport passport-jwt argon2 class-validator class-transformer cookie-parser
   and their TypeScript types where required by the project's tsconfig/package manager.
2. Required environment variables:
   DATABASE_URL
   JWT_ACCESS_SECRET
   JWT_REFRESH_SECRET
   JWT_ISSUER
   JWT_AUDIENCE
   Optional: JWT_ACCESS_TTL_SECONDS (default 900)
   Optional: JWT_REFRESH_TTL_SECONDS (default 2592000)
   Optional: PORT (default 3000)
   Optional: CORS_ORIGIN (comma-separated)
3. Registration currently creates an account with emailVerified=false and also creates tokens.
   If email verification is mandatory before authentication, the register flow must instead create
   the user and return a verification response without issuing a session.
4. Refresh tokens are stored hashed with Argon2id and rotated transactionally.
5. Refresh-token reuse compromises the session family.
6. The optional refreshToken DTO/body fallback exists for non-browser clients; browser clients should
   use the HttpOnly cookie transport.
