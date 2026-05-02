/**
 * Cron jobs module for PaperDB SDK
 * Schedule recurring tasks with human-readable syntax
 */

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string; // Human-readable or cron expression
  cronExpression: string; // Normalized cron expression
  timezone: string;
  action: CronAction;
  enabled: boolean;
  lastRunAt?: string;
  lastRunStatus?: "success" | "failed";
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CronAction =
  | {
      type: "http";
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
  | {
      type: "collection";
      collection: string;
      operation: "delete";
      filter: Record<string, unknown>;
    }
  | {
      type: "collection";
      collection: string;
      operation: "update";
      filter: Record<string, unknown>;
      data: Record<string, unknown>;
    }
  | { type: "function"; functionId: string; payload?: unknown };

export interface CronRun {
  id: string;
  cronJobId: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: unknown;
  error?: string;
  logs?: string[];
}

export interface CreateCronJobOptions {
  name: string;
  description?: string;
  schedule: string; // e.g., "every 1 hour", "daily at 9am", "0 9 * * *"
  timezone?: string;
  action: CronAction;
  enabled?: boolean;
}

export interface UpdateCronJobOptions {
  name?: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  action?: CronAction;
  enabled?: boolean;
}

// Human-readable schedule patterns
const SCHEDULE_PATTERNS: Record<string, string> = {
  "every minute": "* * * * *",
  "every 5 minutes": "*/5 * * * *",
  "every 10 minutes": "*/10 * * * *",
  "every 15 minutes": "*/15 * * * *",
  "every 30 minutes": "*/30 * * * *",
  "every hour": "0 * * * *",
  "every 1 hour": "0 * * * *",
  "every 2 hours": "0 */2 * * *",
  "every 6 hours": "0 */6 * * *",
  "every 12 hours": "0 */12 * * *",
  daily: "0 0 * * *",
  "daily at midnight": "0 0 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
};

/**
 * Parse human-readable schedule to cron expression
 */
export function parseSchedule(schedule: string): string {
  const normalized = schedule.toLowerCase().trim();

  // Check predefined patterns
  if (SCHEDULE_PATTERNS[normalized]) {
    return SCHEDULE_PATTERNS[normalized];
  }

  // Parse "every N minutes/hours"
  const everyMatch = normalized.match(
    /^every (\d+) (minute|minutes|hour|hours|day|days)$/,
  );
  if (everyMatch) {
    const [, num, unit] = everyMatch;
    const n = parseInt(num, 10);
    if (unit.startsWith("minute")) {
      return `*/${n} * * * *`;
    }
    if (unit.startsWith("hour")) {
      return `0 */${n} * * *`;
    }
    if (unit.startsWith("day")) {
      return `0 0 */${n} * *`;
    }
  }

  // Parse "daily at Xam/pm"
  const dailyAtMatch = normalized.match(
    /^daily at (\d{1,2})(:\d{2})?\s*(am|pm)?$/,
  );
  if (dailyAtMatch) {
    let [, hour, minutes, ampm] = dailyAtMatch;
    let h = parseInt(hour, 10);
    const m = minutes ? parseInt(minutes.slice(1), 10) : 0;

    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;

    return `${m} ${h} * * *`;
  }

  // Parse "weekdays at X"
  const weekdaysMatch = normalized.match(
    /^weekdays at (\d{1,2})(:\d{2})?\s*(am|pm)?$/,
  );
  if (weekdaysMatch) {
    let [, hour, minutes, ampm] = weekdaysMatch;
    let h = parseInt(hour, 10);
    const m = minutes ? parseInt(minutes.slice(1), 10) : 0;

    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;

    return `${m} ${h} * * 1-5`;
  }

  // If it looks like a cron expression, return as-is
  if (
    /^[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  throw new Error(
    `Invalid schedule format: "${schedule}". Use formats like "every 5 minutes", "daily at 9am", or a cron expression.`,
  );
}

/**
 * Get human-readable description of next run time
 */
export function getNextRunDescription(nextRunAt: string): string {
  const next = new Date(nextRunAt);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();

  if (diffMs < 0) return "overdue";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "in less than a minute";
  if (diffMins < 60) return `in ${diffMins} minute${diffMins === 1 ? "" : "s"}`;
  if (diffHours < 24)
    return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export class CronClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/cron${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Create a new cron job
   */
  async create(options: CreateCronJobOptions): Promise<CronJob> {
    // Validate and normalize schedule
    const cronExpression = parseSchedule(options.schedule);

    return this.request("/", {
      method: "POST",
      body: JSON.stringify({
        ...options,
        cronExpression,
        timezone: options.timezone ?? "UTC",
        enabled: options.enabled ?? true,
      }),
    });
  }

  /**
   * List all cron jobs
   */
  async list(): Promise<CronJob[]> {
    return this.request("/");
  }

  /**
   * Get a cron job by ID
   */
  async get(id: string): Promise<CronJob> {
    return this.request(`/${id}`);
  }

  /**
   * Update a cron job
   */
  async update(id: string, options: UpdateCronJobOptions): Promise<CronJob> {
    const body: Record<string, unknown> = { ...options };

    // If schedule is being updated, normalize it
    if (options.schedule) {
      body.cronExpression = parseSchedule(options.schedule);
    }

    return this.request(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete a cron job
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.request(`/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Enable a cron job
   */
  async enable(id: string): Promise<CronJob> {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable a cron job
   */
  async disable(id: string): Promise<CronJob> {
    return this.update(id, { enabled: false });
  }

  /**
   * Trigger a cron job immediately
   */
  async trigger(id: string): Promise<CronRun> {
    return this.request(`/${id}/trigger`, {
      method: "POST",
    });
  }

  /**
   * Get run history for a cron job
   */
  async getRuns(
    id: string,
    options?: { limit?: number; offset?: number },
  ): Promise<CronRun[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const query = params.toString();
    return this.request(`/${id}/runs${query ? `?${query}` : ""}`);
  }

  /**
   * Get a specific run
   */
  async getRun(cronJobId: string, runId: string): Promise<CronRun> {
    return this.request(`/${cronJobId}/runs/${runId}`);
  }

  /**
   * Get logs for a specific run
   */
  async getRunLogs(cronJobId: string, runId: string): Promise<string[]> {
    const run = await this.getRun(cronJobId, runId);
    return run.logs ?? [];
  }
}
