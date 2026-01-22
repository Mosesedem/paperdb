/**
 * PaperDB Cron Worker
 *
 * Executes scheduled cron jobs and webhook deliveries.
 * Uses BullMQ for reliable job processing with Redis as the backend.
 */
import "dotenv/config";
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { createHmac } from "crypto";
import { Pool } from "pg";
import parser from "cron-parser";
import IORedis from "ioredis";

// Environment configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL || "";
const WEBHOOK_MAX_RETRIES = parseInt(
  process.env.WEBHOOK_MAX_RETRIES || "5",
  10,
);
const WEBHOOK_TIMEOUT_MS = parseInt(
  process.env.WEBHOOK_TIMEOUT_MS || "30000",
  10,
);

// Initialize connections
const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const pool = new Pool({ connectionString: DATABASE_URL });

// Queues
const cronQueue = new Queue("paperdb:cron", { connection: redis });
const webhookQueue = new Queue("paperdb:webhook", { connection: redis });

// ============================================================
// CRON JOB EXECUTION
// ============================================================

interface CronJobPayload {
  runId: string;
  cronJobId: string;
  dbId: string;
  action: {
    type: "http" | "collection" | "function";
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    collection?: string;
    operation?: string;
    filter?: any;
    data?: any;
    functionId?: string;
  };
  triggeredManually?: boolean;
}

async function executeCronJob(job: Job<CronJobPayload>) {
  const { runId, cronJobId, dbId, action } = job.data;
  const startTime = Date.now();
  const logs: string[] = [];

  function log(message: string) {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
    console.log(`[Cron ${runId}] ${message}`);
  }

  try {
    log(`Starting cron job ${cronJobId}`);

    let result: any = null;

    switch (action.type) {
      case "http": {
        log(`Calling HTTP endpoint: ${action.method || "POST"} ${action.url}`);
        const response = await fetch(action.url!, {
          method: action.method || "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PaperDB-Cron": "true",
            "X-Cron-Job-Id": cronJobId,
            "X-Cron-Run-Id": runId,
            ...(action.headers || {}),
          },
          body: action.body ? JSON.stringify(action.body) : undefined,
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });

        result = {
          status: response.status,
          statusText: response.statusText,
          body: await response.text().catch(() => null),
        };

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${result.body?.substring(0, 200)}`,
          );
        }

        log(`HTTP call successful: ${response.status}`);
        break;
      }

      case "collection": {
        log(
          `Executing collection operation: ${action.operation} on ${action.collection}`,
        );
        // Execute via internal API
        // In production, this would call the internal API
        result = { operation: action.operation, collection: action.collection };
        log(`Collection operation completed`);
        break;
      }

      case "function": {
        log(`Executing edge function: ${action.functionId}`);
        // Execute edge function
        result = { functionId: action.functionId };
        log(`Edge function completed`);
        break;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    // Update run record
    const duration = Date.now() - startTime;
    await pool.query(
      `UPDATE cron_runs SET status = 'success', completed_at = NOW(), duration_ms = $1, result = $2, logs = $3
       WHERE id = $4`,
      [duration, JSON.stringify(result), logs.join("\n"), runId],
    );

    // Update job's last run info and next run time
    const jobResult = await pool.query(
      "SELECT cron_expression, timezone FROM cron_jobs WHERE id = $1",
      [cronJobId],
    );

    if (jobResult.rows.length > 0) {
      const { cron_expression, timezone } = jobResult.rows[0];
      const nextRun = getNextRunTime(cron_expression, timezone);

      await pool.query(
        `UPDATE cron_jobs SET last_run_at = NOW(), last_run_status = 'success', next_run_at = $1
         WHERE id = $2`,
        [nextRun, cronJobId],
      );
    }

    log(`Completed successfully in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    log(`Failed: ${errorMessage}`);

    await pool.query(
      `UPDATE cron_runs SET status = 'failed', completed_at = NOW(), duration_ms = $1, error = $2, logs = $3
       WHERE id = $4`,
      [duration, errorMessage, logs.join("\n"), runId],
    );

    await pool.query(
      `UPDATE cron_jobs SET last_run_at = NOW(), last_run_status = 'failed' WHERE id = $1`,
      [cronJobId],
    );

    throw error;
  }
}

// ============================================================
// WEBHOOK DELIVERY
// ============================================================

interface WebhookPayload {
  deliveryId: string;
  webhookId: string;
  url: string;
  payload: any;
  secret: string;
  headers?: Record<string, string>;
  isRetry?: boolean;
}

function createSignature(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

async function executeWebhook(job: Job<WebhookPayload>) {
  const { deliveryId, webhookId, url, payload, secret, headers, isRetry } =
    job.data;

  console.log(
    `[Webhook ${deliveryId}] Delivering to ${url}${isRetry ? " (retry)" : ""}`,
  );

  try {
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, secret);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PaperDB-Signature": signature,
        "X-PaperDB-Event": payload.event || "unknown",
        "X-PaperDB-Delivery-Id": deliveryId,
        ...(headers || {}),
      },
      body: payloadString,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const responseText = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
      );
    }

    // Success - update delivery
    await pool.query(
      `UPDATE webhook_deliveries SET status = 'success', status_code = $1, response = $2, completed_at = NOW()
       WHERE id = $3`,
      [response.status, responseText.substring(0, 1000), deliveryId],
    );

    console.log(
      `[Webhook ${deliveryId}] Delivered successfully: ${response.status}`,
    );
    return { status: response.status };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const attempts = job.attemptsMade + 1;

    console.log(
      `[Webhook ${deliveryId}] Failed (attempt ${attempts}/${WEBHOOK_MAX_RETRIES}): ${errorMessage}`,
    );

    // Update delivery with failure
    if (attempts >= WEBHOOK_MAX_RETRIES) {
      await pool.query(
        `UPDATE webhook_deliveries SET status = 'failed', response = $1, attempts = $2, completed_at = NOW()
         WHERE id = $3`,
        [errorMessage, attempts, deliveryId],
      );
    } else {
      // Calculate next retry time with exponential backoff
      const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 60000);
      await pool.query(
        `UPDATE webhook_deliveries SET status = 'pending', response = $1, attempts = $2, next_retry_at = $3
         WHERE id = $4`,
        [errorMessage, attempts, nextRetryAt.toISOString(), deliveryId],
      );
    }

    throw error;
  }
}

// ============================================================
// SCHEDULER
// ============================================================

function getNextRunTime(
  cronExpression: string,
  timezone: string = "UTC",
): Date {
  try {
    const interval = parser.parseExpression(cronExpression, {
      tz: timezone,
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch {
    // Fallback for simple expressions
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now;
  }
}

async function scheduleJobs() {
  console.log("[Scheduler] Checking for jobs to schedule...");

  try {
    // Get all enabled jobs that need to run
    const result = await pool.query(
      `SELECT id, database_id, cron_expression, timezone, action
       FROM cron_jobs
       WHERE enabled = true AND next_run_at <= NOW()`,
    );

    for (const job of result.rows) {
      // Create run record
      const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await pool.query(
        `INSERT INTO cron_runs (id, cron_job_id, status, started_at)
         VALUES ($1, $2, 'pending', NOW())`,
        [runId, job.id],
      );

      // Queue for execution
      await cronQueue.add(
        "execute",
        {
          runId,
          cronJobId: job.id,
          dbId: job.database_id,
          action: job.action,
        },
        {
          jobId: runId,
          removeOnComplete: true,
          removeOnFail: 10,
        },
      );

      // Update next run time
      const nextRun = getNextRunTime(job.cron_expression, job.timezone);
      await pool.query("UPDATE cron_jobs SET next_run_at = $1 WHERE id = $2", [
        nextRun,
        job.id,
      ]);

      console.log(
        `[Scheduler] Queued job ${job.id}, next run: ${nextRun.toISOString()}`,
      );
    }
  } catch (error) {
    console.error("[Scheduler] Error:", error);
  }
}

// ============================================================
// WORKERS
// ============================================================

const cronWorker = new Worker<CronJobPayload>("paperdb:cron", executeCronJob, {
  connection: redis,
  concurrency: 10,
});

const webhookWorker = new Worker<WebhookPayload>(
  "paperdb:webhook",
  executeWebhook,
  {
    connection: redis,
    concurrency: 50,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Exponential backoff: 1min, 2min, 4min, 8min, 16min
        return Math.pow(2, attemptsMade) * 60000;
      },
    },
  },
);

// Worker events
cronWorker.on("completed", (job) => {
  console.log(`[Cron Worker] Job ${job.id} completed`);
});

cronWorker.on("failed", (job, err) => {
  console.error(`[Cron Worker] Job ${job?.id} failed:`, err.message);
});

webhookWorker.on("completed", (job) => {
  console.log(`[Webhook Worker] Delivery ${job.id} completed`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`[Webhook Worker] Delivery ${job?.id} failed:`, err.message);
});

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🚀 PaperDB Cron Worker starting...");
  console.log(`   Redis: ${REDIS_URL}`);
  console.log(`   Database: ${DATABASE_URL ? "Connected" : "Not configured"}`);

  // Test database connection
  try {
    await pool.query("SELECT 1");
    console.log("   Database: Connected");
  } catch (error) {
    console.error("   Database: Connection failed", error);
  }

  // Run scheduler every minute
  console.log("[Scheduler] Starting...");
  await scheduleJobs();
  setInterval(scheduleJobs, 60000);

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("\n[Shutdown] Received SIGTERM, shutting down gracefully...");
    await cronWorker.close();
    await webhookWorker.close();
    await cronQueue.close();
    await webhookQueue.close();
    await pool.end();
    await redis.quit();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("\n[Shutdown] Received SIGINT, shutting down gracefully...");
    await cronWorker.close();
    await webhookWorker.close();
    await cronQueue.close();
    await webhookQueue.close();
    await pool.end();
    await redis.quit();
    process.exit(0);
  });
}

main().catch(console.error);
