import { Module } from '@nestjs/common';

import { RepositoryModule } from '../database/repositories/repository.module';

import { AuditService } from './audit.service';

@Module({
  imports: [RepositoryModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
