import { Module } from '@nestjs/common';

import { RefreshTokenModule } from '../../refresh-token/refresh-token.module';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { UserModule } from '../../users/user.module';

import { IdentityService } from './identity.service';

@Module({
  imports: [UserModule, RefreshTokenModule, AuthorizationModule],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
