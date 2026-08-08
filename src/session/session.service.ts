import { Injectable, NotFoundException } from '@nestjs/common';
import { Session } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { SessionRepository } from '../database/repositories/session.repository';
import {
  MAX_ACTIVE_SESSIONS,
  SESSION_DEFAULT_TTL_DAYS,
} from '../security/constants';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    expiresAt?: Date,
  ): Promise<Session> {
    const expiry =
      expiresAt ??
      new Date(Date.now() + SESSION_DEFAULT_TTL_DAYS * 86_400_000);

    const session = await this.sessions.createWithActiveLimit(
      userId,
      MAX_ACTIVE_SESSIONS,
      {
        user: { connect: { id: userId } },
        status: 'ACTIVE',
        ipAddress,
        userAgent,
        expiresAt: expiry,
      },
    );

    await this.audit.sessionCreated(
      userId,
      session.id,
      ipAddress,
      userAgent,
    );

    return session;
  }

  findActive(id: string): Promise<Session | null> {
    return this.sessions.findActiveById(id);
  }

  async requireActive(id: string): Promise<Session> {
    const session = await this.findActive(id);

    if (!session) {
      throw new NotFoundException('Session not found or inactive');
    }

    return session;
  }

  touch(id: string): Promise<Session> {
    return this.sessions.touch(id);
  }

  async revoke(
    id: string,
    ipAddress?: string,
    userAgent?: string,
    reason = 'manual',
  ): Promise<Session> {
    const session = await this.sessions.revoke(id);

    await this.audit.sessionRevoked(
      session.userId,
      session.id,
      ipAddress,
      userAgent,
      reason,
    );

    return session;
  }

  revokeAllForUser(userId: string) {
    return this.sessions.revokeAllForUser(userId);
  }
}
