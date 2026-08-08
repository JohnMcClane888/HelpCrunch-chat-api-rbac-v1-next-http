import { Injectable } from '@nestjs/common';
import { Prisma, Session, SessionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  findActiveById(id: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        id,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });
  }

  findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  /**
   * Creates a session and enforces the active-session limit in one
   * SERIALIZABLE transaction. This prevents concurrent login requests from
   * both observing the same active-session count and exceeding the limit.
   */
  async createWithActiveLimit(
    userId: string,
    maxActiveSessions: number,
    data: Prisma.SessionCreateInput,
  ): Promise<Session> {
    if (!Number.isSafeInteger(maxActiveSessions) || maxActiveSessions < 1) {
      throw new Error('maxActiveSessions must be a positive integer');
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();

            // Expired sessions must not consume an active-session slot.
            await tx.session.updateMany({
              where: {
                userId,
                status: SessionStatus.ACTIVE,
                expiresAt: { lte: now },
              },
              data: {
                status: SessionStatus.EXPIRED,
              },
            });

            const activeSessions = await tx.session.findMany({
              where: {
                userId,
                status: SessionStatus.ACTIVE,
                expiresAt: { gt: now },
              },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            });

            const sessionsToRevoke = Math.max(
              0,
              activeSessions.length - maxActiveSessions + 1,
            );

            if (sessionsToRevoke > 0) {
              const ids = activeSessions
                .slice(0, sessionsToRevoke)
                .map((session) => session.id);

              await tx.session.updateMany({
                where: {
                  id: { in: ids },
                  status: SessionStatus.ACTIVE,
                },
                data: {
                  status: SessionStatus.REVOKED,
                  revokedAt: now,
                },
              });
            }

            return tx.session.create({ data });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5_000,
            timeout: 10_000,
          },
        );
      } catch (error) {
        // PostgreSQL serialization failures can happen under concurrent logins.
        // Retry a small, bounded number of times rather than leaking a transient
        // database conflict to the authentication endpoint.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Failed to create session');
  }

  touch(id: string, lastUsedAt = new Date()): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { lastUsedAt },
    });
  }

  revoke(id: string, _reason = 'manual'): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  revokeAllForUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: { userId, status: SessionStatus.ACTIVE },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  countActiveForUser(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });
  }

  revokeOldestForUser(userId: string): Promise<Session | null> {
    return this.prisma.$transaction(async (tx) => {
      const oldest = await tx.session.findFirst({
        where: { userId, status: SessionStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
      });

      if (!oldest) return null;

      return tx.session.update({
        where: { id: oldest.id },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    });
  }
}
