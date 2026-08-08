import { Injectable } from '@nestjs/common';
import { Permission, Prisma, Role, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  findWithPermissions(name: string): Promise<
    (Role & { permissions: Array<{ permission: Permission }> }) | null
  > {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  listUserRoles(userId: string): Promise<
    Array<UserRole & { role: Role }>
  > {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: { userId, roleId },
      update: {},
    });
  }

  deleteRole(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });
  }

  async replaceUserRoles(
    userId: string,
    roleIds: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.userRole.deleteMany({ where: { userId } });

    if (roleIds.length === 0) {
      return;
    }

    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }
}
