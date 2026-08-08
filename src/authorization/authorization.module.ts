import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RepositoryModule } from '../database/repositories/repository.module';

import { AuthorizationManagementController } from './authorization-management.controller';
import { AuthorizationManagementService } from './authorization-management.service';
import { AuthorizationCache } from './authorization.cache';
import { AuthorizationService } from './authorization.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { RbacController } from './rbac.controller';

@Module({
  imports: [RepositoryModule, RedisModule, AuditModule],
  controllers: [RbacController, AuthorizationManagementController],
  providers: [
    AuthorizationCache,
    AuthorizationService,
    PermissionsGuard,
    AuthorizationManagementService,
  ],
  exports: [
    AuthorizationService,
    PermissionsGuard,
    AuthorizationManagementService,
  ],
})
export class AuthorizationModule {}
