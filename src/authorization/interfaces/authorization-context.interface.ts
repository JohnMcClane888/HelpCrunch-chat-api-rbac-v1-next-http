import { Permission } from '../enums';

export interface AuthorizationContext {
  userId: string;
  roles: readonly string[];
  requiredPermissions: readonly Permission[];
}
