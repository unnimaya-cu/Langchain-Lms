import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD', undefined);
        const db = this.configService.get<number>('REDIS_DB', 0);

        this.client = new Redis({
            host,
            port,
            password: password || undefined,
            db,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
        });

        this.client.on('connect', () => {
            this.logger.log('Successfully connected to Redis');
        });

        this.client.on('error', (err) => {
            this.logger.error(`Redis connection error: ${err.message}`, err.stack);
        });
    }

    async onModuleInit() {
        try {
            await this.client.connect();
        } catch (error) {
            this.logger.error(`Failed to connect to Redis on init: ${error.message}`);
        }
    }

    async onModuleDestroy() {
        this.logger.log('Closing Redis connection...');
        await this.client.quit();
    }

    /**
     * Access underlying raw ioredis instance
     */
    getClient(): Redis {
        return this.client;
    }

    /**
     * Get a string value by key
     */
    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    /**
     * Set a key to string value with optional TTL (in seconds)
     */
    async set(key: string, value: string | number, ttlInSeconds?: number): Promise<'OK'> {
        if (ttlInSeconds) {
            return this.client.set(key, value, 'EX', ttlInSeconds);
        }
        return this.client.set(key, value);
    }

    /**
     * Set a JSON serializable value by key with optional TTL (in seconds)
     */
    async setJson(key: string, value: any, ttlInSeconds?: number): Promise<'OK'> {
        const stringValue = JSON.stringify(value);
        return this.set(key, stringValue, ttlInSeconds);
    }

    /**
     * Get a deserialized JSON value by key
     */
    async getJson<T>(key: string): Promise<T | null> {
        const data = await this.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    /**
     * Delete one or multiple keys
     */
    async del(key: string | string[]): Promise<number> {
        if (Array.isArray(key)) {
            if (key.length === 0) return 0;
            return this.client.del(...key);
        }
        return this.client.del(key);
    }

    /**
     * Check if a key exists
     */
    async exists(key: string): Promise<number> {
        return this.client.exists(key);
    }

    /**
     * Set expiration time in seconds on a key
     */
    async expire(key: string, seconds: number): Promise<number> {
        return this.client.expire(key, seconds);
    }

    /**
     * Flush all keys from the current database
     */
    async flushAll(): Promise<'OK'> {
        return this.client.flushall();
    }
}

