import { UserStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  roles: readonly string[];
  status: UserStatus;
  emailVerified: boolean;
  sessionId: string;
  jti: string;
}
