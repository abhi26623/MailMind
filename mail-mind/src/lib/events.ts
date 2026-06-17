import { redisPublisher, redisSubscriber } from "@/server/redis";

/**
 * Distributed event bus for webhook → SSE push.
 * When a webhook fires, it publishes a tenantId message to Redis.
 * The Redis subscriber listens and dispatches it to the local in-memory listeners.
 * SSE connections subscribe to their tenantId and get instant updates.
 * No DB polling needed, and works across multiple processes/instances.
 */

type Listener = () => void;

class WebhookEventBus {
  private listeners = new Map<string, Set<Listener>>();
  private channel = "webhook-refresh";

  constructor() {
    // Subscribe once per process
    void redisSubscriber.subscribe(this.channel, (err) => {
      if (err) {
        console.error("[Redis] Failed to subscribe to channel:", err);
      } else {
        console.log(`[Redis] Subscribed to ${this.channel} channel.`);
      }
    });

    // When we receive a message from Redis, trigger local listeners
    redisSubscriber.on("message", (channel, message) => {
      if (channel === this.channel) {
        const tenantId = message;
        const set = this.listeners.get(tenantId);
        if (set) {
          for (const listener of set) {
            listener();
          }
        }
      }
    });
  }

  /** Subscribe to updates for a tenantId. Returns an unsubscribe fn. */
  subscribe(tenantId: string, listener: Listener): () => void {
    if (!this.listeners.has(tenantId)) {
      this.listeners.set(tenantId, new Set());
    }
    this.listeners.get(tenantId)!.add(listener);

    return () => {
      const set = this.listeners.get(tenantId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(tenantId);
      }
    };
  }

  /** Publish a refresh event for a given tenant across all instances */
  emit(tenantId: string) {
    redisPublisher.publish(this.channel, tenantId).catch(err => {
      console.error(`[Redis] Failed to publish message for tenant ${tenantId}:`, err);
    });
  }
}

// Singleton -- survives HMR in dev because of globalThis cache
const globalForBus = globalThis as unknown as { webhookBus?: WebhookEventBus };
export const webhookBus = globalForBus.webhookBus ?? new WebhookEventBus();
if (process.env.NODE_ENV !== "production") globalForBus.webhookBus = webhookBus;
