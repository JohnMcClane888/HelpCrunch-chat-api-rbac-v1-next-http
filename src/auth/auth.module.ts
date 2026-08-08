import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { RepositoryModule } from '../database/repositories/repository.module';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module';
import { SecurityModule } from '../security/security.module';
import { SessionModule } from '../session/session.module';
import { UserModule } from '../users/user.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityModule } from './identity/identity.module';
import { PasswordModule } from './password/password.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [
    AuthorizationModule,
    AuditModule,
    ConfigModule,
    PassportModule,
    RepositoryModule,
    UserModule,
    SessionModule,
    RefreshTokenModule,
    PasswordModule,
    TokenModule,
    IdentityModule,
    SecurityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
