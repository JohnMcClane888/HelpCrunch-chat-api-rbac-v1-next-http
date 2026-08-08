import { JwtTokenType } from '../enums';

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  jti: string;
  type: JwtTokenType;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}
