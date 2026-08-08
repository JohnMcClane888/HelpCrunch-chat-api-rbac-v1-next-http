import { JwtTokenType } from '../enums';
import { JwtPayload } from './jwt-payload.interface';

export interface AccessTokenPayload extends JwtPayload {
  type: JwtTokenType.ACCESS;
}
