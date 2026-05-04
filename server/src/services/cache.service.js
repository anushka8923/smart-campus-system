import { createClient } from 'redis';
import { env } from '../config/env.js';

const memoryCache = new Map();
let redisClient;
let redisReady = false;

async function getRedisClient() {
  if (!env.REDIS_URL) return null;
  if (redisReady) return redisClient;
  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (error) => {
      redisReady = false;
      if (env.NODE_ENV !== 'production') console.warn(`Redis cache unavailable: ${error.message}`);
    });
  }
  try {
    if (!redisClient.isOpen) await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch (error) {
    redisReady = false;
    if (env.NODE_ENV !== 'production') console.warn(`Redis cache fallback active: ${error.message}`);
    return null;
  }
}

function isExpired(entry) {
  return entry.expiresAt && entry.expiresAt < Date.now();
}

export async function getCache(key) {
  const redis = await getRedisClient();
  if (redis) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  const entry = memoryCache.get(key);
  if (!entry || isExpired(entry)) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

export async function setCache(key, value, ttlSeconds = 60) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
  });
}

export async function invalidateCache(prefix) {
  const redis = await getRedisClient();
  if (redis) {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(keys);
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}
