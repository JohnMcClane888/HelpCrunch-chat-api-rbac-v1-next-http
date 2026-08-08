import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { UserRepository } from '../database/repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findByUsername(username);
  }

  createWithRole(data: Prisma.UserCreateInput, roleName: string): Promise<User> {
    return this.users.createWithRole(data, roleName);
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.users.update(id, data);
  }

  markPasswordChanged(id: string, changedAt?: Date): Promise<User> {
    return this.users.markPasswordChanged(id, changedAt);
  }

  setStatus(id: string, status: UserStatus): Promise<User> {
    return this.users.setStatus(id, status);
  }

  softDelete(id: string): Promise<User> {
    return this.users.softDelete(id);
  }
}
