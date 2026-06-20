import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisPublisher?: Redis;
  redisSubscriber?: Redis;
};

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const redisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
};

// Publisher client used to send messages to the pub/sub channel.
export const redisPublisher =
  globalForRedis.redisPublisher ?? new Redis(redisUrl, redisOptions);

// Subscriber client used to listen for messages from the pub/sub channel.
// Redis requires a separate client connection for subscribing.
export const redisSubscriber =
  globalForRedis.redisSubscriber ?? new Redis(redisUrl, redisOptions);

redisPublisher.on("error", (err) => {
  console.warn("[Redis] Publisher unavailable:", err.message);
});

redisSubscriber.on("error", (err) => {
  console.warn("[Redis] Subscriber unavailable:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisPublisher = redisPublisher;
  globalForRedis.redisSubscriber = redisSubscriber;
}
