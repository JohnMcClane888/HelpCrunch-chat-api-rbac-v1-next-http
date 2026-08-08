import { AuditAction } from '@prisma/client';

export interface AuditEvent {
  action: AuditAction;
  userId?: string | null;
  sessionId?: string | null;
  jti?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
