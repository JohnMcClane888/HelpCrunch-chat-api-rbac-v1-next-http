import { applyDecorators, SetMetadata } from '@nestjs/common';

import {
  PERMISSIONS_METADATA_KEY,
  PERMISSIONS_MODE_ALL,
  PERMISSIONS_MODE_METADATA_KEY,
  PERMISSIONS_MODE_ANY,
} from '../constants/authorization.constants';
import { Permission } from '../enums/permission.enum';

export type PermissionCheckMode =
  | typeof PERMISSIONS_MODE_ALL
  | typeof PERMISSIONS_MODE_ANY;

export const Permissions = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_METADATA_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_METADATA_KEY, PERMISSIONS_MODE_ALL),
  );

export const PermissionsAny = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_METADATA_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_METADATA_KEY, PERMISSIONS_MODE_ANY),
  );

export const PermissionsAll = (...permissions: Permission[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_METADATA_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_METADATA_KEY, PERMISSIONS_MODE_ALL),
  );
