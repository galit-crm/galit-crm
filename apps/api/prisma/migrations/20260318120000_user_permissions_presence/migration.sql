-- Additive migration: align "User" with Prisma schema (no DROP, no data deletion).
-- Safe to run once; uses IF NOT EXISTS / exception guards where needed.

-- Extend UserRole enum (EXPERT, BILLING) if missing
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'EXPERT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'BILLING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enums used by User (create only if absent)
DO $$ BEGIN
  CREATE TYPE "WorkStatus" AS ENUM ('AVAILABLE', 'IN_FIELD', 'IN_OFFICE', 'OFFLINE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkMode" AS ENUM ('OFFICE', 'FIELD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Multi-select departments + permission overrides
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "serviceDepartments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canViewFinance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canEditFinance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canDeleteCustomers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canDeleteLeads" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canManageUsers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canManagePermissions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canViewAllRecords" BOOLEAN NOT NULL DEFAULT false;

-- Work / presence (defaults match schema.prisma)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workStatus" "WorkStatus" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentWorkMode" "WorkMode";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentProjectId" TEXT;

-- FK to Project (optional; ignore if already present)
DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_currentProjectId_fkey"
    FOREIGN KEY ("currentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
