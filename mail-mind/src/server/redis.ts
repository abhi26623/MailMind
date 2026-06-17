import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisPublisher?: Redis;
  redisSubscriber?: Redis;
};

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Publisher client used to send messages to the pub/sub channel
export const redisPublisher =
  globalForRedis.redisPublisher ?? new Redis(redisUrl);

// Subscriber client used to listen for messages from the pub/sub channel
// (Redis requires a separate client connection for subscribing)
export const redisSubscriber =
  globalForRedis.redisSubscriber ?? new Redis(redisUrl);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisPublisher = redisPublisher;
  globalForRedis.redisSubscriber = redisSubscriber;
}
