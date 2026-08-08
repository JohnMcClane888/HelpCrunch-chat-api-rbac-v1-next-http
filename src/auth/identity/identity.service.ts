import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { RefreshTokenService } from '../../refresh-token/refresh-token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { UserService } from '../../users/user.service';
import { AuthenticatedUser } from '../../security/interfaces/authenticated-user.interface';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface';

@Injectable()
export class IdentityService {
  constructor(
    private readonly users: UserService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly authorization: AuthorizationService,
  ) {}

  async validateAccessUser(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);

    return this.toAuthenticatedUser(
      user,
      payload.sessionId,
      payload.jti,
      payload.iat,
    );
  }

  async validateRefreshUser(
    payload: RefreshTokenPayload,
    refreshToken: string,
    _ip?: string,
    _userAgent?: string,
  ): Promise<AuthenticatedUser> {
    await this.refreshTokens.verifyStoredToken(
      refreshToken,
      payload.jti,
      payload.sessionId,
    );

    const user = await this.users.findById(payload.sub);

    return this.toAuthenticatedUser(
      user,
      payload.sessionId,
      payload.jti,
      payload.iat,
    );
  }

  private async toAuthenticatedUser(
    user: Awaited<ReturnType<UserService['findById']>>,
    sessionId: string,
    jti: string,
    issuedAt?: number,
  ): Promise<AuthenticatedUser> {
    if (!user) throw new UnauthorizedException('User not found');
    if (user.deletedAt) throw new UnauthorizedException('User deleted');
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Account blocked');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account inactive');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    if (
      user.passwordChangedAt &&
      issuedAt &&
      user.passwordChangedAt.getTime() > issuedAt * 1000
    ) {
      throw new UnauthorizedException('Password changed');
    }

    const roles = await this.authorization.getUserRoles(user.id);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles,
      status: user.status,
      emailVerified: user.emailVerified,
      sessionId,
      jti,
    };
  }
}
