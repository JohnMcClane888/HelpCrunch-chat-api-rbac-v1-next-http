import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IdentityService } from '../../auth/identity/identity.service';
import { RefreshTokenPayload } from '../../auth/interfaces/refresh-token-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import {
  JWT_REFRESH_STRATEGY,
  REFRESH_TOKEN_COOKIE,
} from '../constants';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  JWT_REFRESH_STRATEGY,
) {
  constructor(
    config: ConfigService,
    private readonly identityService: IdentityService,
  ) {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const cookie = request.cookies?.[REFRESH_TOKEN_COOKIE];

          if (typeof cookie === 'string' && cookie.length > 0) {
            return cookie;
          }

          const bodyToken = request.body?.refreshToken;

          return typeof bodyToken === 'string' && bodyToken.length > 0
            ? bodyToken
            : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
      algorithms: ['HS256'],
    });
  }

  validate(
    request: Request,
    payload: RefreshTokenPayload,
  ): Promise<AuthenticatedUser> {
    const refreshToken =
      request.cookies?.[REFRESH_TOKEN_COOKIE] ??
      request.body?.refreshToken;

    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    

    return this.identityService.validateRefreshUser(
  payload,
  refreshToken,
);
  }
}
