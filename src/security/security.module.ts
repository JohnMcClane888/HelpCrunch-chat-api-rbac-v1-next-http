import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { IdentityModule } from '../auth/identity/identity.module';
import { AuthorizationModule } from '../authorization/authorization.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AccessJwtStrategy } from './strategies/access-jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    IdentityModule,
    AuthorizationModule,
  ],
  providers: [
    AccessJwtStrategy,
    RefreshJwtStrategy,
    JwtAuthGuard,
    RefreshJwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    PassportModule,
    JwtAuthGuard,
    RefreshJwtAuthGuard,
    RolesGuard,
  ],
})
export class SecurityModule {}
