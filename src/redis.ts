import * as Redis from "ioredis";

export const redis =
  process.env.NODE_ENV === "production"
    ? new Redis(6379, "18.213.78.4")
    : new Redis();
