import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IdentityService } from '../../auth/identity/identity.service';
import { AccessTokenPayload } from '../../auth/interfaces/access-token-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JWT_STRATEGY } from '../constants';

@Injectable()
export class AccessJwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(config: ConfigService, private readonly identityService: IdentityService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    return this.identityService.validateAccessUser(payload);
  }
}
