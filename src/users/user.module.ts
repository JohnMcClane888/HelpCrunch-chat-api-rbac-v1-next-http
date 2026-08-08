import { Module } from '@nestjs/common';
import { RepositoryModule } from '../database/repositories/repository.module';
import { UserService } from './user.service';

@Module({
  imports: [RepositoryModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
