import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface';

export interface JwtRequest extends Request {
  user: AuthenticatedUser;
}
