import { Injectable } from '@nestjs/common';

import { PermissionRepository } from '../database/repositories/permission.repository';
import { RoleRepository } from '../database/repositories/role.repository';
import { AuthorizationCache } from './authorization.cache';
import { Permission as PermissionKey } from './enums/permission.enum';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly permissions: PermissionRepository,
    private readonly roles: RoleRepository,
    private readonly cache: AuthorizationCache,
  ) {}

  /**
   * Returns the user's effective permissions as a Set for fast guard checks.
   * The Set is deliberately kept internal to authorization checks; API
   * responses should use listUserPermissions(), because JSON does not serialize
   * a Set's values.
   */
  async getUserPermissions(userId: string): Promise<ReadonlySet<string>> {
    const cached = await this.cache.get(userId);
    if (cached) return cached;

    const permissions = await this.permissions.findForUser(userId);
    const result = new Set(permissions.map((permission) => permission.name));
    await this.cache.set(userId, permissions);
    return result;
  }

  /** Returns effective permission names in deterministic order. */
  async listUserPermissions(userId: string): Promise<readonly string[]> {
    return [...(await this.getUserPermissions(userId))].sort();
  }

  async getUserRoles(userId: string): Promise<readonly string[]> {
    const assignments = await this.roles.listUserRoles(userId);
    return assignments.map((assignment) => assignment.role.name);
  }

  async hasUserPermission(
    userId: string,
    permission: PermissionKey,
  ): Promise<boolean> {
    return (await this.getUserPermissions(userId)).has(permission);
  }

  async hasAllUserPermissions(
    userId: string,
    permissions: readonly PermissionKey[],
  ): Promise<boolean> {
    const current = await this.getUserPermissions(userId);
    return permissions.every((permission) => current.has(permission));
  }

  async hasAnyUserPermission(
    userId: string,
    permissions: readonly PermissionKey[],
  ): Promise<boolean> {
    const current = await this.getUserPermissions(userId);
    return permissions.some((permission) => current.has(permission));
  }

  async hasAnyUserRole(
    userId: string,
    requiredRoles: readonly string[],
  ): Promise<boolean> {
    if (requiredRoles.length === 0) return true;
    const current = new Set(await this.getUserRoles(userId));
    return requiredRoles.some((role) => current.has(role));
  }

  async hasAllUserRoles(
    userId: string,
    requiredRoles: readonly string[],
  ): Promise<boolean> {
    if (requiredRoles.length === 0) return true;
    const current = new Set(await this.getUserRoles(userId));
    return requiredRoles.every((role) => current.has(role));
  }

  invalidateUser(userId: string): Promise<void> {
    return this.cache.invalidate(userId);
  }
}
