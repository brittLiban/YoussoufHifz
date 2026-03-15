-- Migration: switch unit columns to decimal and add revision tracking
-- Allows fractional pages (0.25, 0.5, 0.75) and a separate revision goal per user

ALTER TABLE "memorization_goals"
  ALTER COLUMN "total_units" TYPE NUMERIC(8,2),
  ALTER COLUMN "daily_target" TYPE NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS "revision_total_units" NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "revision_daily_target" NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "revision_deadline" DATE;

ALTER TABLE "progress_logs"
  ALTER COLUMN "units_logged" TYPE NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS "revision_units_logged" NUMERIC(6,2) NOT NULL DEFAULT 0;
