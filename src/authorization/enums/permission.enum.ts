// ============================================================================
// File: src/authorization/enums/permission.enum.ts
// ============================================================================

export enum Permission {
  /**
   * Users
   */
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  /**
   * Chats
   */
  CHAT_READ = 'chat:read',
  CHAT_CREATE = 'chat:create',
  CHAT_UPDATE = 'chat:update',
  CHAT_DELETE = 'chat:delete',

  /**
   * Contacts
   */
  CONTACT_READ = 'contact:read',
  CONTACT_CREATE = 'contact:create',
  CONTACT_UPDATE = 'contact:update',
  CONTACT_DELETE = 'contact:delete',

  /**
   * Companies
   */
  COMPANY_READ = 'company:read',
  COMPANY_CREATE = 'company:create',
  COMPANY_UPDATE = 'company:update',
  COMPANY_DELETE = 'company:delete',

  /**
   * Tickets
   */
  TICKET_READ = 'ticket:read',
  TICKET_CREATE = 'ticket:create',
  TICKET_UPDATE = 'ticket:update',
  TICKET_DELETE = 'ticket:delete',

  /**
   * Sessions
   */
  SESSION_READ = 'session:read',
  SESSION_REVOKE = 'session:revoke',

  /**
   * Audit
   */
  AUDIT_READ = 'audit:read',

  /**
   * Settings
   */
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  /**
   * Authorization / RBAC administration
   */
  AUTHORIZATION_MANAGE = 'authorization:manage',

  /**
   * System
   */
  ADMIN = 'admin:*',
}