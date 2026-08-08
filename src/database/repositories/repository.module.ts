import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuditLogRepository } from './audit-log.repository';
import { ChatRepository } from './chat.repository';
import { PermissionRepository } from './permission.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RoleRepository } from './role.repository';
import { SessionRepository } from './session.repository';
import { UserRepository } from './user.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
    AuditLogRepository,
    ChatRepository,
    RoleRepository,
    PermissionRepository,
  ],
  exports: [
    UserRepository,
    SessionRepository,
    RefreshTokenRepository,
    AuditLogRepository,
    ChatRepository,
    RoleRepository,
    PermissionRepository,
  ],
})
export class RepositoryModule {}
