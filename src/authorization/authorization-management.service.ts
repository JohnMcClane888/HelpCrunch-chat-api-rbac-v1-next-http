import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PermissionRepository } from '../database/repositories/permission.repository';
import { RoleRepository } from '../database/repositories/role.repository';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from './authorization.service';
import { AuditService } from '../audit/audit.service';

export interface AuthorizationAuditContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthorizationManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  listRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createRole(name: string, description?: string, auditContext?: AuthorizationAuditContext) {
    const normalized = name.trim().toUpperCase();
    if (!normalized) throw new BadRequestException('Role name is required');

    try {
      const role = await this.prisma.role.create({
        data: { name: normalized, description: description?.trim() || null },
      });

      if (auditContext) {
        await this.audit.roleCreated(
          auditContext.actorUserId,
          role.id,
          role.name,
          auditContext.ipAddress,
          auditContext.userAgent,
        );
      }

      return role;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Role already exists');
      }
      throw error;
    }
  }

  async updateRole(id: string, name?: string, description?: string, auditContext?: AuthorizationAuditContext) {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    const changes: Record<string, unknown> = {};
    if (name !== undefined) changes.name = name.trim().toUpperCase();
    if (description !== undefined) changes.description = description.trim() || null;

    try {
      const updatedRole = await this.prisma.role.update({
        where: { id },
        data: changes,
      });

      if (auditContext) {
        await this.audit.roleUpdated(
          auditContext.actorUserId,
          updatedRole.id,
          changes,
          auditContext.ipAddress,
          auditContext.userAgent,
        );
      }

      return updatedRole;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Role name already exists');
      }
      throw error;
    }
  }

  async replaceRolePermissions(roleId: string, permissionNames: string[], auditContext?: AuthorizationAuditContext) {
    const role = await this.roles.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    const uniqueNames = [...new Set(permissionNames.map((v) => v.trim()).filter(Boolean))];
    const permissions = await this.permissions.findByNames(uniqueNames);
    if (permissions.length !== uniqueNames.length) {
      const found = new Set(permissions.map((p) => p.name));
      const missing = uniqueNames.filter((name) => !found.has(name));
      throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            permissionId: permission.id,
          })),
        });
      }
    });

    const affectedUsers = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    for (const user of affectedUsers) {
      await this.authorization.invalidateUser(user.userId);
    }

    const updated = await this.roles.findWithPermissions(role.name);

    if (auditContext) {
      await this.audit.rolePermissionsReplaced(
        auditContext.actorUserId,
        role.id,
        role.name,
        uniqueNames,
        auditContext.ipAddress,
        auditContext.userAgent,
      );
    }

    return updated;
  }

  async assignRoleToUser(userId: string, roleName: string, auditContext?: AuthorizationAuditContext) {
    const role = await this.roles.findByName(roleName.trim().toUpperCase());
    if (!role) throw new NotFoundException('Role not found');

    await this.roles.assignRole(userId, role.id);
    await this.authorization.invalidateUser(userId);

    if (auditContext) {
      await this.audit.roleAssigned(
        auditContext.actorUserId,
        userId,
        role.id,
        role.name,
        auditContext.ipAddress,
        auditContext.userAgent,
      );
    }

    return { userId, role: role.name };
  }

  async removeRoleFromUser(userId: string, roleName: string, auditContext?: AuthorizationAuditContext) {
    const role = await this.roles.findByName(roleName.trim().toUpperCase());
    if (!role) throw new NotFoundException('Role not found');

    try {
      await this.roles.deleteRole(userId, role.id);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('User role assignment not found');
      }
      throw error;
    }

    await this.authorization.invalidateUser(userId);

    if (auditContext) {
      await this.audit.roleRemoved(
        auditContext.actorUserId,
        userId,
        role.id,
        role.name,
        auditContext.ipAddress,
        auditContext.userAgent,
      );
    }

    return { userId, role: role.name };
  }

  async getUserRoles(userId: string) {
    return this.roles.listUserRoles(userId);
  }

  async getUserPermissions(userId: string) {
    return [...(await this.authorization.getUserPermissions(userId))].sort();
  }
}
