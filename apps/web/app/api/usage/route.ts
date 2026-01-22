import { NextResponse } from "next/server";
import { auth } from "@/app/lib/server/auth";
import { headers } from "next/headers";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    maxDatabases: 1,
    maxCollectionsPerDb: 5,
    maxDocuments: 1000,
    maxApiRequestsPerMonth: 1000,
    maxStorageBytes: 104857600, // 100 MB
    realtimeEnabled: false,
  },
  pro: {
    maxDatabases: 5,
    maxCollectionsPerDb: 25,
    maxDocuments: 50000,
    maxApiRequestsPerMonth: 100000,
    maxStorageBytes: 5368709120, // 5 GB
    realtimeEnabled: true,
  },
  team: {
    maxDatabases: -1, // unlimited
    maxCollectionsPerDb: -1,
    maxDocuments: 500000,
    maxApiRequestsPerMonth: 1000000,
    maxStorageBytes: 53687091200, // 50 GB
    realtimeEnabled: true,
  },
};

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user plan
    const userResult = await sql`
      SELECT plan FROM "user" WHERE id = ${userId}
    `;
    const plan = userResult[0]?.plan || "free";
    const limits =
      PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    // Get database count
    const dbCountResult = await sql`
      SELECT COUNT(*)::int as count FROM databases WHERE user_id = ${userId}
    `;
    const databaseCount = dbCountResult[0]?.count || 0;

    // Get document count across all user's databases
    const docCountResult = await sql`
      SELECT COUNT(*)::int as count 
      FROM kv_store k
      JOIN databases d ON k.db_id = d.id
      WHERE d.user_id = ${userId}
    `;
    const documentCount = docCountResult[0]?.count || 0;

    // Get API requests this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const apiRequestsResult = await sql`
      SELECT COUNT(*)::int as count 
      FROM db_events e
      JOIN databases d ON e.db_id = d.id
      WHERE d.user_id = ${userId}
      AND e.created_at >= ${startOfMonth.toISOString()}
    `;
    const apiRequests = apiRequestsResult[0]?.count || 0;

    // Get collection count (unique collections across all databases)
    const collectionCountResult = await sql`
      SELECT COUNT(DISTINCT k.collection)::int as count 
      FROM kv_store k
      JOIN databases d ON k.db_id = d.id
      WHERE d.user_id = ${userId}
    `;
    const collectionCount = collectionCountResult[0]?.count || 0;

    // Estimate storage (sum of data column sizes)
    const storageResult = await sql`
      SELECT COALESCE(SUM(LENGTH(k.data::text)), 0)::bigint as bytes
      FROM kv_store k
      JOIN databases d ON k.db_id = d.id
      WHERE d.user_id = ${userId}
    `;
    const storageBytes = Number(storageResult[0]?.bytes || 0);

    // Get subscription info if exists
    const subscriptionResult = await sql`
      SELECT status, "currentPeriodEnd", "cancelAtPeriodEnd"
      FROM subscription
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    const subscription = subscriptionResult[0] || null;

    return NextResponse.json({
      plan,
      databases: {
        current: databaseCount,
        limit: limits.maxDatabases,
      },
      collections: {
        current: collectionCount,
        limit: limits.maxCollectionsPerDb,
      },
      documents: {
        current: documentCount,
        limit: limits.maxDocuments,
      },
      apiRequests: {
        current: apiRequests,
        limit: limits.maxApiRequestsPerMonth,
      },
      storage: {
        current: storageBytes,
        limit: limits.maxStorageBytes,
      },
      realtimeEnabled: limits.realtimeEnabled,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 },
    );
  }
}
