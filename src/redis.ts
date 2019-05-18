import * as Redis from "ioredis";

export const redis =
  process.env.NODE_ENV === "production"
    ? new Redis('agoraexpo-redis.zfbnx0.0001.use1.cache.amazonaws.com:6379')
    : new Redis();
