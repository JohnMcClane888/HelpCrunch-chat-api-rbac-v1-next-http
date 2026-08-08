import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username: username.trim() },
    });
  }

  async createWithRole(
    data: Prisma.UserCreateInput,
    roleName: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { name: roleName },
        select: { id: true },
      });

      if (!role) {
        throw new Error(`RBAC role not found: ${roleName}`);
      }

      const user = await tx.user.create({ data });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return user;
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  markPasswordChanged(id: string, changedAt = new Date()): Promise<User> {
    return this.update(id, { passwordChangedAt: changedAt });
  }

  setStatus(id: string, status: UserStatus): Promise<User> {
    return this.update(id, { status });
  }

  softDelete(id: string): Promise<User> {
    return this.update(id, { deletedAt: new Date(), status: UserStatus.INACTIVE });
  }
}
