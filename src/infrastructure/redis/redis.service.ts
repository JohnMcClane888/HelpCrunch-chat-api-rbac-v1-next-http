import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';

type RedisClientLike = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  quit(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
};

type RedisSubscriberLike = RedisClientLike & {
  subscribe(
    channel: string,
    listener: (message: string) => void,
  ): Promise<void>;
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
      const client = createClient({
        url: this.redisUrl,
      }) as unknown as RedisClientLike;

      client.on('error', (...args: unknown[]) => {
        this.logger.warn(`Redis error: ${String(args[0])}`);
        this.client = null;
      });

      await (
        client as RedisClientLike & {
          connect(): Promise<void>;
        }
      ).connect();

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
      const subscriber = createClient({
        url: this.redisUrl,
      }) as unknown as RedisSubscriberLike;

      subscriber.on('error', (...args: unknown[]) => {
        this.logger.warn(
          `Redis subscriber error: ${String(args[0])}`,
        );
        this.subscriber = null;
      });

      await subscriber.connect();

      await subscriber.subscribe(
        'authorization:invalidate',
        (message: string) => {
          try {
            const parsed = JSON.parse(message) as {
              userId?: string;
            };

            if (parsed.userId) {
              onUserInvalidated(parsed.userId);
            }
          } catch (error) {
            this.logger.warn(
              `Invalid authorization invalidation message: ${String(error)}`,
            );
          }
        },
      );

      this.subscriber = subscriber;
    } catch {
      this.subscriber = null;
    }
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();

    if (!client) return null;

    return client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const client = await this.getClient();

    if (!client) return;

    await client.set(
      key,
      value,
      ttlSeconds ? { EX: ttlSeconds } : undefined,
    );
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();

    if (!client) return;

    await client.del(key);
  }

  async publish(
    channel: string,
    message: string,
  ): Promise<void> {
    const client = await this.getClient();

    if (!client) return;

    await client.publish(channel, message);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
    await this.subscriber?.quit();
  }
}