-- Add plan column to user table
ALTER TABLE "user" ADD COLUMN "plan" text DEFAULT 'free';

-- Create subscription table for Polar integration
CREATE TABLE "subscription" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "polarCustomerId" text,
  "polarSubscriptionId" text UNIQUE,
  "plan" text NOT NULL DEFAULT 'free',
  "status" text NOT NULL DEFAULT 'active',
  "currentPeriodStart" timestamptz,
  "currentPeriodEnd" timestamptz,
  "cancelAtPeriodEnd" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster subscription lookups
CREATE INDEX "subscription_userId_idx" ON "subscription" ("userId");
CREATE INDEX "subscription_polarCustomerId_idx" ON "subscription" ("polarCustomerId");

-- Create monthly usage aggregation table
CREATE TABLE "monthly_usage" (
  "id" serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "dbId" text,
  "month" date NOT NULL,
  "apiRequests" integer DEFAULT 0,
  "documentsCreated" integer DEFAULT 0,
  "storageBytes" bigint DEFAULT 0,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("userId", "dbId", "month")
);

-- Create index for faster usage lookups
CREATE INDEX "monthly_usage_userId_idx" ON "monthly_usage" ("userId");
CREATE INDEX "monthly_usage_month_idx" ON "monthly_usage" ("month");

-- Create plan_limits table for configurable plan limits
CREATE TABLE "plan_limits" (
  "id" text NOT NULL PRIMARY KEY,
  "plan" text NOT NULL UNIQUE,
  "maxDatabases" integer NOT NULL DEFAULT 1,
  "maxCollectionsPerDb" integer NOT NULL DEFAULT 5,
  "maxDocuments" integer NOT NULL DEFAULT 1000,
  "maxApiRequestsPerMonth" integer NOT NULL DEFAULT 1000,
  "maxStorageBytes" bigint NOT NULL DEFAULT 104857600,
  "realtimeEnabled" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert default plan limits
INSERT INTO "plan_limits" ("id", "plan", "maxDatabases", "maxCollectionsPerDb", "maxDocuments", "maxApiRequestsPerMonth", "maxStorageBytes", "realtimeEnabled")
VALUES 
  ('plan_free', 'free', 1, 5, 1000, 1000, 104857600, false),
  ('plan_pro', 'pro', 5, 25, 50000, 100000, 5368709120, true),
  ('plan_team', 'team', -1, -1, 500000, 1000000, 53687091200, true);
