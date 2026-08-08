import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  findByNames(names: string[]): Promise<Permission[]> {
    if (names.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.permission.findMany({
      where: { name: { in: names } },
      orderBy: { name: 'asc' },
    });
  }

  findForUser(userId: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        roles: {
          some: {
            role: {
              userRoles: {
                some: { userId },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findForUserByNames(
    userId: string,
    names: string[],
  ): Promise<Permission[]> {
    if (names.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.permission.findMany({
      where: {
        name: { in: names },
        roles: {
          some: {
            role: {
              userRoles: {
                some: { userId },
              },
            },
          },
        },
      },
    });
  }
}
