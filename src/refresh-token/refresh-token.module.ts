import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RepositoryModule } from '../database/repositories/repository.module';
import { SessionModule } from '../session/session.module';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    AuditModule,RepositoryModule, SessionModule],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
