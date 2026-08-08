import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { JwtTokenType } from '../enums';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface';
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  accessJti: string;
  refreshJti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(user: Pick<User, 'id' | 'email'>, sessionId: string): Promise<IssuedTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessTtl = this.getTtl('JWT_ACCESS_TTL_SECONDS', 900);
    const refreshTtl = this.getTtl('JWT_REFRESH_TTL_SECONDS', 2_592_000);

    const base = {
      sub: user.id,
      email: user.email,
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          ...base,
          jti: accessJti,
          type: JwtTokenType.ACCESS,
        } satisfies Omit<AccessTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
          audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
          expiresIn: accessTtl,
          algorithm: 'HS256',
        },
      ),
      this.jwt.signAsync(
        {
          ...base,
          jti: refreshJti,
          type: JwtTokenType.REFRESH,
        } satisfies Omit<RefreshTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
          audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
          expiresIn: refreshTtl,
          algorithm: 'HS256',
        },
      ),
    ]);

    const now = Date.now();

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(now + accessTtl * 1000),
      refreshTokenExpiresAt: new Date(now + refreshTtl * 1000),
      accessJti,
      refreshJti,
    };
  }

  private getTtl(name: string, fallback: number): number {
    const raw = this.config.get<string>(name);
    const value = raw === undefined ? fallback : Number(raw);

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive integer in seconds`);
    }

    return value;
  }
}
