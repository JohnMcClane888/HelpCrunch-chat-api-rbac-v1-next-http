import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type RedisClientLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  publish(channel: string, message: string): Promise<unknown>;
  quit(): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
};

type RedisSubscriberLike = RedisClientLike & {
  subscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
  connect(): Promise<void>;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientLike | null = null;
  private subscriber: RedisSubscriberLike | null = null;

  constructor(@Inject('REDIS_URL') private readonly redisUrl: string) {}

  private async getClient(): Promise<RedisClientLike | null> {
    if (this.client) return this.client;

    try {
      // Optional dependency: install `redis` for distributed caching.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const redis = require('redis') as {
        createClient(options: { url: string }): RedisClientLike;
      };

      const client = redis.createClient({ url: this.redisUrl });
      client.on('error', (...args: unknown[]) => {
        this.logger.warn(`Redis error: ${String(args[0])}`);
        this.client = null;
      });

      await (client as RedisClientLike & { connect(): Promise<void> }).connect();
      this.client = client;
      return client;
    } catch {
      return null;
    }
  }

  async subscribeInvalidation(
    onUserInvalidated: (userId: string) => void,
  ): Promise<void> {
    if (this.subscriber) return;

    try {
      const redis = require('redis') as {
        createClient(options: { url: string }): RedisSubscriberLike;
      };

      const subscriber = redis.createClient({ url: this.redisUrl });
      subscriber.on('error', (...args: unknown[]) => {
        this.logger.warn(`Redis subscriber error: ${String(args[0])}`);
        this.subscriber = null;
      });

      await subscriber.connect();
      await subscriber.subscribe(
        'authorization:invalidate',
        (message: string) => {
          try {
            const parsed = JSON.parse(message) as { userId?: string };
            if (parsed.userId) onUserInvalidated(parsed.userId);
          } catch (error) {
            this.logger.warn(
              `Invalid authorization invalidation message: ${String(error)}`,
            );
          }
        },
      );

      this.subscriber = subscriber;
    } catch (error) {
      this.logger.warn(
        `Redis invalidation subscriber unavailable: ${String(error)}`,
      );
    }
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      return await client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed: ${String(error)}`);
      this.client = null;
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.set(key, value, { EX: ttlSeconds });
    } catch (error) {
      this.logger.warn(`Redis SET failed: ${String(error)}`);
      this.client = null;
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed: ${String(error)}`);
      this.client = null;
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.publish(channel, message);
    } catch (error) {
      this.logger.warn(`Redis PUBLISH failed: ${String(error)}`);
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
