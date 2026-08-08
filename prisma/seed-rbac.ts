import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  { name: 'authorization:manage', description: 'Manage roles and permissions' },{'name': 'user:read', 'description': 'USER_READ'}, {'name': 'user:create', 'description': 'USER_CREATE'}, {'name': 'user:update', 'description': 'USER_UPDATE'}, {'name': 'user:delete', 'description': 'USER_DELETE'}, {'name': 'chat:read', 'description': 'CHAT_READ'}, {'name': 'chat:create', 'description': 'CHAT_CREATE'}, {'name': 'chat:update', 'description': 'CHAT_UPDATE'}, {'name': 'chat:delete', 'description': 'CHAT_DELETE'}, {'name': 'contact:read', 'description': 'CONTACT_READ'}, {'name': 'contact:create', 'description': 'CONTACT_CREATE'}, {'name': 'contact:update', 'description': 'CONTACT_UPDATE'}, {'name': 'contact:delete', 'description': 'CONTACT_DELETE'}, {'name': 'company:read', 'description': 'COMPANY_READ'}, {'name': 'company:create', 'description': 'COMPANY_CREATE'}, {'name': 'company:update', 'description': 'COMPANY_UPDATE'}, {'name': 'company:delete', 'description': 'COMPANY_DELETE'}, {'name': 'ticket:read', 'description': 'TICKET_READ'}, {'name': 'ticket:create', 'description': 'TICKET_CREATE'}, {'name': 'ticket:update', 'description': 'TICKET_UPDATE'}, {'name': 'ticket:delete', 'description': 'TICKET_DELETE'}, {'name': 'session:read', 'description': 'SESSION_READ'}, {'name': 'session:revoke', 'description': 'SESSION_REVOKE'}, {'name': 'audit:read', 'description': 'AUDIT_READ'}, {'name': 'settings:read', 'description': 'SETTINGS_READ'}, {'name': 'settings:update', 'description': 'SETTINGS_UPDATE'}, {'name': 'admin:*', 'description': 'ADMIN'}];

const rolePermissions: Record<string, string[]> = {
  USER: ['chat:read', 'chat:create', 'contact:read', 'ticket:read', 'ticket:create'],
  AGENT: ['user:read', 'chat:read', 'chat:create', 'contact:read', 'ticket:read', 'ticket:create', 'session:read'],
  ADMIN: permissions.map((permission) => permission.name),
  OWNER: permissions.map((permission) => permission.name),
};

async function main(): Promise<void> {
  const permissionRecords = new Map<string, { id: string; name: string }>();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
      },
      create: permission,
    });

    permissionRecords.set(record.name, record);
  }

  for (const roleName of Object.keys(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    const names = rolePermissions[roleName];

    for (const permissionName of names) {
      const permission = permissionRecords.get(permissionName);

      if (!permission) {
        throw new Error(`Unknown permission: ${permissionName}`);
      }

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const bootstrapAdminEmail = (process.env.RBAC_BOOTSTRAP_ADMIN_EMAIL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'test@example.com' : '')).toLowerCase();
  if (bootstrapAdminEmail) {
    const bootstrapUser = await prisma.user.findUnique({
      where: { email: bootstrapAdminEmail },
      select: { id: true, email: true },
    });

    if (!bootstrapUser) {
      throw new Error(`RBAC_BOOTSTRAP_ADMIN_EMAIL user not found: ${bootstrapAdminEmail}`);
    }

    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
      select: { id: true },
    });

    if (!adminRole) {
      throw new Error('ADMIN role was not seeded');
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: bootstrapUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: bootstrapUser.id,
        roleId: adminRole.id,
      },
    });

    console.log(`RBAC bootstrap admin assigned: ${bootstrapUser.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
