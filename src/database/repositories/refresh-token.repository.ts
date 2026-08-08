import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken, RefreshTokenStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { jti } });
  }

  findActiveByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        jti,
        status: RefreshTokenStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });
  }

  create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  revoke(
    jti: string,
    reason: string,
    replacedByJti?: string,
  ): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { jti },
      data: {
        status: RefreshTokenStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
        replacedByJti,
        usedAt: new Date(),
      },
    });
  }

  markRotated(jti: string, replacedByJti: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { jti },
      data: {
        status: RefreshTokenStatus.ROTATED,
        usedAt: new Date(),
        revokedAt: new Date(),
        revokedReason: 'rotated',
        replacedByJti,
      },
    });
  }

  markReused(jti: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { jti },
      data: {
        status: RefreshTokenStatus.REUSED,
        usedAt: new Date(),
        revokedAt: new Date(),
        revokedReason: 'reuse_detected',
      },
    });
  }

  revokeAllForSession(sessionId: string, reason = 'session_revoked'): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        status: RefreshTokenStatus.ACTIVE,
      },
      data: {
        status: RefreshTokenStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  revokeAllForUser(userId: string, reason = 'user_revoked'): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        status: RefreshTokenStatus.ACTIVE,
      },
      data: {
        status: RefreshTokenStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }
}
