import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../constants';

export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
