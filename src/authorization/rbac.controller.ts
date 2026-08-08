import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthorizationService } from './authorization.service';
import { AuthenticatedUser } from '../security/interfaces/authenticated-user.interface';
import { CurrentUser } from '../security/decorators/current-user.decorator';

/**
 * Self-service authorization endpoints.
 *
 * These routes only require a valid access token. A user must not need a
 * permission such as `user:read` merely to discover their own effective RBAC
 * permissions; otherwise ordinary USER accounts can never inspect their own
 * authorization state.
 */
@Controller('authorization')
@UseGuards(AuthGuard('jwt'))
export class RbacController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get('me/permissions')
  async getMyPermissions(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.id,
      roles: user.roles,
      permissions: await this.authorization.listUserPermissions(user.id),
    };
  }
}
