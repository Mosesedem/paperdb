import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

// Alias for consistency
export function getRedis(): Redis {
  return redis;
}
