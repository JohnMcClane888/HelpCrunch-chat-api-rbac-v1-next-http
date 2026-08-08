import { Injectable } from '@nestjs/common';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogData {
  action: AuditAction;
  userId?: string | null;
  sessionId?: string | null;
  jti?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAuditLogData): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId ?? null,
        sessionId: data.sessionId ?? null,
        jti: data.jti ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  findByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limit),
    });
  }

  findBySessionId(sessionId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limit),
    });
  }

  findByAction(action: AuditAction, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limit),
    });
  }

  findByJti(jti: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { jti },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limit),
    });
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isSafeInteger(limit) || limit < 1) return 100;
    return Math.min(limit, 500);
  }
}
