import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuditLogRepository } from './audit-log.repository';
import { ChatRepository } from './chat.repository';
import { PermissionRepository } from './permission.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RoleRepository } from './role.repository';
import { SessionRepository } from './session.repository';
import { UserRepository } from './user.repository';

import { CHAT_REPOSITORY } from '../../chat/chat.constants';


@Global()
@Module({
  imports: [
    PrismaModule,
  ],

  providers: [

    UserRepository,

    SessionRepository,

    RefreshTokenRepository,

    AuditLogRepository,


    {
      provide: CHAT_REPOSITORY,
      useClass: ChatRepository,
    },


    RoleRepository,

    PermissionRepository,

  ],


  exports: [

    UserRepository,

    SessionRepository,

    RefreshTokenRepository,

    AuditLogRepository,


    CHAT_REPOSITORY,


    RoleRepository,

    PermissionRepository,

  ],
})
export class RepositoryModule {}