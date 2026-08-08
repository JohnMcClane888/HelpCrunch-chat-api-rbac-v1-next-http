import { Injectable, OnModuleInit } from '@nestjs/common';
import { Permission } from '@prisma/client';

import { RedisService } from '../infrastructure/redis/redis.service';

interface LocalEntry {
  expiresAt: number;
  permissions: ReadonlySet<string>;
}

@Injectable()
export class AuthorizationCache implements OnModuleInit {
  private readonly local = new Map<string, LocalEntry>();
  private readonly ttlSeconds = 30;
  private readonly maxEntries = 10_000;
  private readonly prefix = 'authz:permissions:';

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.redis.subscribeInvalidation((userId) => {
      this.local.delete(userId);
    });
  }

  async get(userId: string): Promise<ReadonlySet<string> | null> {
    const key = `${this.prefix}${userId}`;
    const remote = await this.redis.get(key);
    if (remote) {
      try {
        return new Set<string>(JSON.parse(remote) as string[]);
      } catch {
        await this.redis.del(key);
      }
    }

    const local = this.local.get(userId);
    if (!local || local.expiresAt <= Date.now()) {
      this.local.delete(userId);
      return null;
    }
    return local.permissions;
  }

  async set(userId: string, permissions: Permission[]): Promise<void> {
    const values = permissions.map((permission) => permission.name);
    await this.redis.set(
      `${this.prefix}${userId}`,
      JSON.stringify(values),
      this.ttlSeconds,
    );

    if (this.local.size >= this.maxEntries) {
      const oldest = this.local.keys().next().value as string | undefined;
      if (oldest) this.local.delete(oldest);
    }

    this.local.set(userId, {
      expiresAt: Date.now() + this.ttlSeconds * 1000,
      permissions: new Set(values),
    });
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(`${this.prefix}${userId}`);
    this.local.delete(userId);
    await this.redis.publish(
      'authorization:invalidate',
      JSON.stringify({ userId }),
    );
  }

  clearLocal(): void {
    this.local.clear();
  }
}
