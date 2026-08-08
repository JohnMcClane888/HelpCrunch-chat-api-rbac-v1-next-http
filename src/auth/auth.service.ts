import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from '../authorization/authorization.service';

import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { SessionService } from '../session/session.service';
import { UserService } from '../users/user.service';
import { PasswordService } from './password/password.service';
import { LoginDto, RegisterDto } from './dto';
import { IssuedTokens, TokenService } from './token/token.service';

const DEFAULT_REGISTRATION_ROLE = 'USER';

export interface AuthSessionResult {
  user: {
    id: string;
    email: string;
    username: string;
    roles: readonly string[];
  };
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
}

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    username: string;
    roles: readonly string[];
  };
  emailVerificationRequired: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly authorization: AuthorizationService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    const [emailExists, usernameExists] = await Promise.all([
      this.users.findByEmail(email),
      this.users.findByUsername(username),
    ]);

    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    if (usernameExists) {
      throw new ConflictException('Username already registered');
    }

    const passwordHash = await this.passwords.hash(dto.password);

    try {
      const user = await this.users.createWithRole(
        {
          email,
          username,
          passwordHash,
          emailVerified: false,
        },
        DEFAULT_REGISTRATION_ROLE,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: [DEFAULT_REGISTRATION_ROLE],
        },
        emailVerificationRequired: true,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username already registered');
      }

      throw error;
    }
  }

  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSessionResult> {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());

    if (!user || user.deletedAt) {
      await this.audit.loginFailed(null, ip, userAgent, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwords.verify(
      user.passwordHash,
      dto.password,
    );

    if (!valid) {
      await this.audit.loginFailed(user.id, ip, userAgent, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await this.audit.loginFailed(user.id, ip, userAgent, 'email_not_verified');
      throw new UnauthorizedException('Email not verified');
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.loginFailed(user.id, ip, userAgent, 'account_not_active');
      throw new UnauthorizedException('Account is not active');
    }

    return this.createLoginSession(user, ip, userAgent);
  }

  async refresh(
    userId: string,
    sessionId: string,
    oldJti: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSessionResult> {
    const user = await this.users.findById(userId);

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const session = await this.sessions.findActive(sessionId);

    if (!session || session.userId !== user.id) {
      throw new UnauthorizedException('Session is not active');
    }

    const next = await this.tokens.issue(user, session.id);

    await this.refreshTokens.rotate(
      refreshToken,
      oldJti,
      session.id,
      next.refreshToken,
      next.refreshJti,
      next.refreshTokenExpiresAt,
      user.id,
      ip,
      userAgent,
    );

    await this.sessions.touch(session.id);

    await this.audit.refreshSuccess(
      user.id,
      session.id,
      next.refreshJti,
      ip,
      userAgent,
    );

    return this.toAuthResult(user, next);
  }

  async logout(
    sessionId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const session = await this.sessions.findActive(sessionId);

    await this.refreshTokens.revokeSession(sessionId);

    await this.audit.logout(
      session?.userId ?? null,
      sessionId,
      ip,
      userAgent,
    );
  }

  private async createLoginSession(
    user: {
      id: string;
      email: string;
      username: string;
    },
    ip?: string,
    userAgent?: string,
  ): Promise<AuthSessionResult> {
    const refreshTtl = this.getRefreshTtlSeconds();

    const session = await this.sessions.create(
      user.id,
      ip,
      userAgent,
      new Date(Date.now() + refreshTtl * 1000),
    );

    const tokens = await this.tokens.issue(user, session.id);

    await this.refreshTokens.store(
      user.id,
      session.id,
      tokens.refreshToken,
      tokens.refreshJti,
      tokens.refreshTokenExpiresAt,
      ip,
      userAgent,
    );

    await this.audit.loginSuccess(user.id, session.id, ip, userAgent);

    return this.toAuthResult(user, tokens);
  }

  private async toAuthResult(
    user: {
      id: string;
      email: string;
      username: string;
    },
    tokens: IssuedTokens,
  ): Promise<AuthSessionResult> {
    const roles = await this.authorization.getUserRoles(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles,
      },
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
    };
  }

  private getRefreshTtlSeconds(): number {
    const raw = process.env.JWT_REFRESH_TTL_SECONDS;
    const value = raw === undefined ? 2_592_000 : Number(raw);

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('JWT_REFRESH_TTL_SECONDS must be a positive integer');
    }

    return value;
  }
}
