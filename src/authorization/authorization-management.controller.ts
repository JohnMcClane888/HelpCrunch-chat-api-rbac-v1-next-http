import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permission } from './enums/permission.enum';
import { AuthorizationManagementService } from './authorization-management.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';

interface AuthenticatedRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { id?: string; sub?: string };
}

function auditContext(request: AuthenticatedRequest) {
  const actorUserId = request.user?.id ?? request.user?.sub;
  if (!actorUserId) {
    throw new Error('Authenticated user identity is missing');
  }

  const forwardedFor = request.headers['x-forwarded-for'];
  const ipAddress =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : request.ip;

  const userAgent = request.headers['user-agent'];
  return {
    actorUserId,
    ipAddress,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}

@Controller('admin/authorization')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions(Permission.AUTHORIZATION_MANAGE)
export class AuthorizationManagementController {
  constructor(
    private readonly management: AuthorizationManagementService,
  ) {}

  @Get('roles')
  listRoles() {
    return this.management.listRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto, @Req() request: AuthenticatedRequest) {
    return this.management.createRole(dto.name, dto.description, auditContext(request));
  }

  @Patch('roles/:roleId')
  updateRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.management.updateRole(
      roleId,
      dto.name,
      dto.description,
      auditContext(request),
    );
  }

  @Get('permissions')
  listPermissions() {
    return this.management.listPermissions();
  }

  @Put('roles/:roleId/permissions')
  replaceRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.management.replaceRolePermissions(
      roleId,
      dto.permissionNames,
      auditContext(request),
    );
  }

  @Get('users/:userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.management.getUserRoles(userId);
  }

  @Post('users/:userId/roles')
  assignRole(
    @Param('userId') userId: string,
    @Body() dto: AssignUserRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.management.assignRoleToUser(userId, dto.roleName, auditContext(request));
  }

  @Delete('users/:userId/roles/:roleName')
  removeRole(
    @Param('userId') userId: string,
    @Param('roleName') roleName: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.management.removeRoleFromUser(userId, roleName, auditContext(request));
  }

  @Get('users/:userId/permissions')
  getUserPermissions(@Param('userId') userId: string) {
    return this.management.getUserPermissions(userId);
  }
}
