import { Injectable } from '@nestjs/common';
import { AuditAction, AuditLog } from '@prisma/client';

import { AuditLogRepository } from '../database/repositories/audit-log.repository';

export interface WriteAuditLogInput {
  action: AuditAction;
  userId?: string | null;
  sessionId?: string | null;
  jti?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditLogs: AuditLogRepository) {}

  write(input: WriteAuditLogInput): Promise<AuditLog> {
    return this.auditLogs.create({
      action: input.action,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      jti: input.jti ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    });
  }

  loginSuccess(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    return this.write({ action: AuditAction.LOGIN_SUCCESS, userId, sessionId, ipAddress, userAgent });
  }

  loginFailed(userId: string | null, ipAddress?: string, userAgent?: string, reason?: string) {
    return this.write({
      action: AuditAction.LOGIN_FAILED,
      userId,
      ipAddress,
      userAgent,
      metadata: reason ? { reason } : null,
    });
  }

  logout(userId: string | null, sessionId: string, ipAddress?: string, userAgent?: string) {
    return this.write({ action: AuditAction.LOGOUT, userId, sessionId, ipAddress, userAgent });
  }

  refreshSuccess(userId: string, sessionId: string, jti: string, ipAddress?: string, userAgent?: string) {
    return this.write({ action: AuditAction.REFRESH_SUCCESS, userId, sessionId, jti, ipAddress, userAgent });
  }

  refreshFailed(
    userId: string | null,
    sessionId: string | null,
    jti: string | null,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ) {
    return this.write({
      action: AuditAction.REFRESH_FAILED,
      userId,
      sessionId,
      jti,
      ipAddress,
      userAgent,
      metadata: reason ? { reason } : null,
    });
  }

  refreshReuseDetected(userId: string | null, sessionId: string, jti: string, ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.REFRESH_REUSE_DETECTED,
      userId,
      sessionId,
      jti,
      ipAddress,
      userAgent,
    });
  }

  sessionCreated(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    return this.write({ action: AuditAction.SESSION_CREATED, userId, sessionId, ipAddress, userAgent });
  }

  sessionRevoked(
    userId: string | null,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ) {
    return this.write({
      action: AuditAction.SESSION_REVOKED,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      metadata: reason ? { reason } : null,
    });
  }

  roleCreated(actorUserId: string, roleId: string, roleName: string, ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.ROLE_CREATED,
      userId: actorUserId,
      ipAddress,
      userAgent,
      metadata: { roleId, roleName },
    });
  }

  roleUpdated(actorUserId: string, roleId: string, changes: Record<string, unknown>, ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.ROLE_UPDATED,
      userId: actorUserId,
      ipAddress,
      userAgent,
      metadata: { roleId, changes },
    });
  }

  roleAssigned(actorUserId: string, targetUserId: string, roleId: string, roleName: string, ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.ROLE_ASSIGNED,
      userId: actorUserId,
      ipAddress,
      userAgent,
      metadata: { targetUserId, roleId, roleName },
    });
  }

  roleRemoved(actorUserId: string, targetUserId: string, roleId: string, roleName: string, ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.ROLE_REMOVED,
      userId: actorUserId,
      ipAddress,
      userAgent,
      metadata: { targetUserId, roleId, roleName },
    });
  }

  rolePermissionsReplaced(actorUserId: string, roleId: string, roleName: string, permissionNames: string[], ipAddress?: string, userAgent?: string) {
    return this.write({
      action: AuditAction.ROLE_PERMISSIONS_REPLACED,
      userId: actorUserId,
      ipAddress,
      userAgent,
      metadata: { roleId, roleName, permissionNames },
    });
  }
}
