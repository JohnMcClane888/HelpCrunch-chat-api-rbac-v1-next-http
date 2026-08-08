import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RepositoryModule } from '../database/repositories/repository.module';
import { SessionService } from './session.service';

@Module({
  imports: [
    AuditModule,RepositoryModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
