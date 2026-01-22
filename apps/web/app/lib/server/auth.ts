import { betterAuth } from "better-auth";
import { polar, checkout, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { Pool } from "pg";
import { nanoid } from "nanoid";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});

// Helper to determine plan from product ID
function getPlanFromProductId(productId: string): string {
  const productPlans: Record<string, string> = {
    [process.env.POLAR_PRO_PRODUCT_ID || ""]: "pro",
    [process.env.POLAR_TEAM_PRODUCT_ID || ""]: "team",
  };
  return productPlans[productId] || "free";
}

export const auth = betterAuth({
  trustedOrigins: [
    "https://paperdb.dev",
    "https://www.paperdb.dev",
    "http://localhost:6565",
  ],
  database: pool,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRO_PRODUCT_ID!,
              slug: "pro",
            },
            {
              productId: process.env.POLAR_TEAM_PRODUCT_ID!,
              slug: "team",
            },
          ],
          successUrl: process.env.POLAR_SUCCESS_URL || "/dashboard/settings",
          authenticatedUsersOnly: true,
        }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET as string,
          onSubscriptionCreated: async (payload) => {
            const userId = payload.data.customer.externalId;
            const plan = getPlanFromProductId(payload.data.productId);

            // Insert subscription record
            await pool.query(
              `INSERT INTO subscription (id, "userId", "polarCustomerId", "polarSubscriptionId", plan, status, "currentPeriodStart", "currentPeriodEnd")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT ("polarSubscriptionId") DO UPDATE SET
                 plan = $5,
                 status = $6,
                 "currentPeriodStart" = $7,
                 "currentPeriodEnd" = $8,
                 "updatedAt" = NOW()`,
              [
                nanoid(),
                userId,
                payload.data.customerId,
                payload.data.id,
                plan,
                "active",
                payload.data.currentPeriodStart,
                payload.data.currentPeriodEnd,
              ],
            );

            // Update user plan
            await pool.query(`UPDATE "user" SET plan = $1 WHERE id = $2`, [
              plan,
              userId,
            ]);
          },
          onSubscriptionCanceled: async (payload) => {
            await pool.query(
              `UPDATE subscription SET status = 'canceled', "cancelAtPeriodEnd" = true, "updatedAt" = NOW()
               WHERE "polarSubscriptionId" = $1`,
              [payload.data.id],
            );
          },
          onSubscriptionRevoked: async (payload) => {
            const userId = payload.data.customer.externalId;

            // Mark subscription as inactive
            await pool.query(
              `UPDATE subscription SET status = 'inactive', "updatedAt" = NOW()
               WHERE "polarSubscriptionId" = $1`,
              [payload.data.id],
            );

            // Downgrade user to free plan
            await pool.query(`UPDATE "user" SET plan = 'free' WHERE id = $1`, [
              userId,
            ]);
          },
          onSubscriptionUpdated: async (payload) => {
            const plan = getPlanFromProductId(payload.data.productId);
            const userId = payload.data.customer.externalId;

            await pool.query(
              `UPDATE subscription SET 
                 plan = $1,
                 "currentPeriodEnd" = $2,
                 "updatedAt" = NOW()
               WHERE "polarSubscriptionId" = $3`,
              [plan, payload.data.currentPeriodEnd, payload.data.id],
            );

            // Update user plan
            await pool.query(`UPDATE "user" SET plan = $1 WHERE id = $2`, [
              plan,
              userId,
            ]);
          },
        }),
      ],
    }),
  ],
});
