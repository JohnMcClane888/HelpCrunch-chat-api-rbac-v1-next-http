import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshToken, RefreshTokenStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RefreshTokenRepository } from '../database/repositories/refresh-token.repository';
import { SessionService } from '../session/session.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async store(
    userId: string,
    sessionId: string,
    token: string,
    jti: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const tokenHash = await argon2.hash(token);

    return this.refreshTokens.create({
      user: { connect: { id: userId } },
      session: { connect: { id: sessionId } },
      jti,
      tokenHash,
      status: RefreshTokenStatus.ACTIVE,
      expiresAt,
      ipAddress,
      userAgent,
    });
  }

  async verifyStoredToken(
    refreshToken: string,
    jti: string,
    sessionId: string,
  ): Promise<RefreshToken> {
    const stored = await this.refreshTokens.findByJti(jti);

    if (!stored) {
      await this.audit.refreshFailed(null, sessionId, jti, undefined, undefined, 'not_found');
      throw new UnauthorizedException('Refresh token not found');
    }

    if (stored.sessionId !== sessionId) {
      await this.audit.refreshFailed(stored.userId, sessionId, jti, undefined, undefined, 'session_mismatch');
      throw new UnauthorizedException('Refresh token session mismatch');
    }

    if (stored.expiresAt <= new Date()) {
      await this.audit.refreshFailed(stored.userId, sessionId, jti, stored.ipAddress ?? undefined, stored.userAgent ?? undefined, 'expired');
      throw new UnauthorizedException('Refresh token expired');
    }

    const valid = await argon2.verify(stored.tokenHash, refreshToken);

    if (!valid) {
      await this.audit.refreshFailed(stored.userId, sessionId, jti, stored.ipAddress ?? undefined, stored.userAgent ?? undefined, 'invalid_token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.status !== RefreshTokenStatus.ACTIVE) {
      await this.handleReuse(stored);
    }

    return stored;
  }

  async rotate(
    refreshToken: string,
    oldJti: string,
    sessionId: string,
    newToken: string,
    newJti: string,
    newExpiresAt: Date,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    try {
      return await this.prisma.$transaction(async (tx) => {
      const current = await tx.refreshToken.findUnique({
        where: { jti: oldJti },
      });

      if (!current || current.userId !== userId || current.sessionId !== sessionId) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (current.status !== RefreshTokenStatus.ACTIVE) {
        throw new ConflictException('Refresh token reuse detected');
      }

      if (current.expiresAt <= new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      if (!(await argon2.verify(current.tokenHash, refreshToken))) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newHash = await argon2.hash(newToken);

      await tx.refreshToken.update({
        where: { jti: oldJti },
        data: {
          status: RefreshTokenStatus.ROTATED,
          usedAt: new Date(),
          revokedAt: new Date(),
          revokedReason: 'rotated',
          replacedByJti: newJti,
        },
      });

        return tx.refreshToken.create({
          data: {
            userId,
            sessionId,
            jti: newJti,
            tokenHash: newHash,
            status: RefreshTokenStatus.ACTIVE,
            expiresAt: newExpiresAt,
            ipAddress,
            userAgent,
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const current = await this.refreshTokens.findByJti(oldJti);

        if (current && current.status !== RefreshTokenStatus.ACTIVE) {
          return this.handleReuse(current);
        }
      }

      throw error;
    }
  }

  async revokeByJti(jti: string, reason = 'manual'): Promise<RefreshToken> {
    return this.refreshTokens.revoke(jti, reason);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.refreshTokens.revokeAllForSession(sessionId);
    await this.sessions.revoke(sessionId);
  }

  private async handleReuse(token: RefreshToken): Promise<never> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: {
          sessionId: token.sessionId,
          status: RefreshTokenStatus.ACTIVE,
        },
        data: {
          status: RefreshTokenStatus.REVOKED,
          revokedAt: new Date(),
          revokedReason: 'reuse_detected',
        },
      }),
      this.prisma.refreshToken.update({
        where: { jti: token.jti },
        data: {
          status: RefreshTokenStatus.REUSED,
          revokedAt: new Date(),
          revokedReason: 'reuse_detected',
        },
      }),
      this.prisma.session.update({
        where: { id: token.sessionId },
        data: {
          status: 'COMPROMISED',
          revokedAt: new Date(),
        },
      }),
    ]);

    await this.audit.refreshReuseDetected(
      token.userId,
      token.sessionId,
      token.jti,
      token.ipAddress ?? undefined,
      token.userAgent ?? undefined,
    );

    throw new UnauthorizedException('Refresh token reuse detected');
  }
}
