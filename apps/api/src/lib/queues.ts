import { Queue } from "bullmq";

const redisConnection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

let cronQueue: Queue | null = null;
let webhookQueue: Queue | null = null;

export function getCronQueue(): Queue {
  if (!cronQueue) {
    cronQueue = new Queue("paperdb:cron", {
      connection: redisConnection,
    });
  }

  return cronQueue;
}

export function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    webhookQueue = new Queue("paperdb:webhook", {
      connection: redisConnection,
    });
  }

  return webhookQueue;
}
