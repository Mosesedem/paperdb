import { sql } from "./db";

export interface PlanLimits {
  plan: string;
  maxDatabases: number;
  maxCollectionsPerDb: number;
  maxDocuments: number;
  maxApiRequestsPerMonth: number;
  maxStorageBytes: number;
  realtimeEnabled: boolean;
}

// Default limits (fallback if database query fails)
const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: {
    plan: "free",
    maxDatabases: 1,
    maxCollectionsPerDb: 5,
    maxDocuments: 1000,
    maxApiRequestsPerMonth: 1000,
    maxStorageBytes: 104857600, // 100 MB
    realtimeEnabled: false,
  },
  pro: {
    plan: "pro",
    maxDatabases: 5,
    maxCollectionsPerDb: 25,
    maxDocuments: 50000,
    maxApiRequestsPerMonth: 100000,
    maxStorageBytes: 5368709120, // 5 GB
    realtimeEnabled: true,
  },
  team: {
    plan: "team",
    maxDatabases: -1, // unlimited
    maxCollectionsPerDb: -1, // unlimited
    maxDocuments: 500000,
    maxApiRequestsPerMonth: 1000000,
    maxStorageBytes: 53687091200, // 50 GB
    realtimeEnabled: true,
  },
};

export async function getPlanLimits(plan: string): Promise<PlanLimits> {
  try {
    const result = await sql`
      SELECT 
        plan,
        "maxDatabases",
        "maxCollectionsPerDb",
        "maxDocuments",
        "maxApiRequestsPerMonth",
        "maxStorageBytes",
        "realtimeEnabled"
      FROM plan_limits
      WHERE plan = ${plan}
    `;

    if (result.length > 0) {
      return {
        plan: result[0].plan,
        maxDatabases: result[0].maxDatabases,
        maxCollectionsPerDb: result[0].maxCollectionsPerDb,
        maxDocuments: result[0].maxDocuments,
        maxApiRequestsPerMonth: result[0].maxApiRequestsPerMonth,
        maxStorageBytes: Number(result[0].maxStorageBytes),
        realtimeEnabled: result[0].realtimeEnabled,
      };
    }
  } catch (error) {
    console.error("Failed to fetch plan limits from database:", error);
  }

  return DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
}

export async function getUserPlan(dbId: string): Promise<string> {
  try {
    const result = await sql`
      SELECT u.plan
      FROM databases d
      JOIN "user" u ON d.user_id = u.id
      WHERE d.id = ${dbId}
    `;

    if (result.length > 0 && result[0].plan) {
      return result[0].plan;
    }
  } catch (error) {
    console.error("Failed to fetch user plan:", error);
  }

  return "free";
}

export async function getCurrentMonthUsage(dbId: string): Promise<{
  apiRequests: number;
  documents: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    // Count API requests this month from db_events
    const apiRequestsResult = await sql`
      SELECT COUNT(*)::int as count
      FROM db_events
      WHERE db_id = ${dbId}
      AND created_at >= ${startOfMonth.toISOString()}
    `;

    // Count total documents in this database
    const documentsResult = await sql`
      SELECT COUNT(*)::int as count
      FROM kv_store
      WHERE db_id = ${dbId}
    `;

    return {
      apiRequests: apiRequestsResult[0]?.count || 0,
      documents: documentsResult[0]?.count || 0,
    };
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return { apiRequests: 0, documents: 0 };
  }
}

export async function getDatabaseCount(userId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM databases
      WHERE user_id = ${userId}
    `;
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Failed to count databases:", error);
    return 0;
  }
}

export async function getCollectionCount(dbId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(DISTINCT collection)::int as count
      FROM kv_store
      WHERE db_id = ${dbId}
    `;
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Failed to count collections:", error);
    return 0;
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
  limit?: number;
  current?: number;
  plan?: string;
}

export async function checkApiQuota(dbId: string): Promise<QuotaCheckResult> {
  const plan = await getUserPlan(dbId);
  const limits = await getPlanLimits(plan);
  const usage = await getCurrentMonthUsage(dbId);

  // -1 means unlimited
  if (limits.maxApiRequestsPerMonth === -1) {
    return { allowed: true, plan };
  }

  if (usage.apiRequests >= limits.maxApiRequestsPerMonth) {
    return {
      allowed: false,
      error: `Monthly API request limit reached (${limits.maxApiRequestsPerMonth.toLocaleString()} requests). Upgrade your plan for more.`,
      limit: limits.maxApiRequestsPerMonth,
      current: usage.apiRequests,
      plan,
    };
  }

  return { allowed: true, plan };
}

export async function checkDocumentQuota(dbId: string): Promise<QuotaCheckResult> {
  const plan = await getUserPlan(dbId);
  const limits = await getPlanLimits(plan);
  const usage = await getCurrentMonthUsage(dbId);

  // -1 means unlimited
  if (limits.maxDocuments === -1) {
    return { allowed: true, plan };
  }

  if (usage.documents >= limits.maxDocuments) {
    return {
      allowed: false,
      error: `Document limit reached (${limits.maxDocuments.toLocaleString()} documents). Upgrade your plan for more.`,
      limit: limits.maxDocuments,
      current: usage.documents,
      plan,
    };
  }

  return { allowed: true, plan };
}

export async function checkRealtimeQuota(dbId: string): Promise<QuotaCheckResult> {
  const plan = await getUserPlan(dbId);
  const limits = await getPlanLimits(plan);

  if (!limits.realtimeEnabled) {
    return {
      allowed: false,
      error: "Realtime subscriptions are not available on the free plan. Upgrade to Pro or Team.",
      plan,
    };
  }

  return { allowed: true, plan };
}
