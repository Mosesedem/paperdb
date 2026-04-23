import { Queue } from "bullmq";
import { getRedis } from "./redis.js";

let cronQueue: Queue | null = null;
let webhookQueue: Queue | null = null;

export function getCronQueue(): Queue {
  if (!cronQueue) {
    cronQueue = new Queue("paperdb:cron", {
      connection: getRedis(),
    });
  }

  return cronQueue;
}

export function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    webhookQueue = new Queue("paperdb:webhook", {
      connection: getRedis(),
    });
  }

  return webhookQueue;
}
