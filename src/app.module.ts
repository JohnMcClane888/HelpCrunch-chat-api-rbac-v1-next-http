import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditModule } from './audit/audit.module';
import { ChatModule } from './chat/chat.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RefreshTokenModule } from './refresh-token/refresh-token.module';
import { SecurityModule } from './security/security.module';
import { SessionModule } from './session/session.module';
import { UserModule } from './users/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    SessionModule,
    RefreshTokenModule,
    SecurityModule,
    AuthorizationModule,
    AuditModule,
    ChatModule,
    AuthModule,
  ],
})
export class AppModule {}
