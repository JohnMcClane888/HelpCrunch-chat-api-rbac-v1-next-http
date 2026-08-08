import { JwtTokenType } from '../enums';
import { JwtPayload } from './jwt-payload.interface';

export interface RefreshTokenPayload extends JwtPayload {
  type: JwtTokenType.REFRESH;
}
