import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  PERMISSIONS_METADATA_KEY,
  PERMISSIONS_MODE_ALL,
  PERMISSIONS_MODE_METADATA_KEY,
  PERMISSIONS_MODE_ANY,
} from '../constants/authorization.constants';
import { Permission } from '../enums/permission.enum';
import { AuthorizationService } from '../authorization.service';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    sub?: string;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const mode =
      this.reflector.getAllAndOverride<string>(
        PERMISSIONS_MODE_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? PERMISSIONS_MODE_ALL;

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id ?? request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }

    const allowed =
      mode === PERMISSIONS_MODE_ANY
        ? await this.authorization.hasAnyUserPermission(userId, permissions)
        : await this.authorization.hasAllUserPermissions(userId, permissions);

    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
