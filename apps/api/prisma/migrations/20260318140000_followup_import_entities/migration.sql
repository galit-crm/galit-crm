-- Followup bulk import: entities + job log + quote → contact link

-- CreateEnum (idempotent for DBs that partially applied earlier migrations)
DO $$ BEGIN
  CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'PREVIEW_READY', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone2" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone3" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "fax" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyRegNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "balanceLegacy" DECIMAL(18,2);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthdayLegacy" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "cityCodeLegacy" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "zipLegacy" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "legacyUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerContact" (
    "id" TEXT NOT NULL,
    "importLegacyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "fax" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "roleTitle" TEXT,
    "department" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SalesOrder" (
    "id" TEXT NOT NULL,
    "importLegacyId" TEXT,
    "orderNumber" TEXT,
    "customerId" TEXT NOT NULL,
    "customerContactId" TEXT,
    "quoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "orderDate" TIMESTAMP(3),
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "internalNotes" TEXT,
    "deliverySummary" TEXT,
    "paymentTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerInteraction" (
    "id" TEXT NOT NULL,
    "importLegacyId" TEXT,
    "customerId" TEXT NOT NULL,
    "customerContactId" TEXT,
    "activityType" TEXT,
    "status" TEXT,
    "subject" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "activityDate" TIMESTAMP(3),
    "legacyOwnerName" TEXT,
    "location" TEXT,
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileType" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "storedPath" TEXT,
    "userId" TEXT,
    "previewJson" JSONB,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImportJobError" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "lineRef" TEXT,
    "message" TEXT NOT NULL,
    "rowData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerContact_customerId_importLegacyId_key" ON "CustomerContact"("customerId", "importLegacyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerContact_importLegacyId_idx" ON "CustomerContact"("importLegacyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_importLegacyId_key" ON "SalesOrder"("importLegacyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalesOrder_customerId_idx" ON "SalesOrder"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalesOrder_importLegacyId_idx" ON "SalesOrder"("importLegacyId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerInteraction_importLegacyId_key" ON "CustomerInteraction"("importLegacyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerInteraction_customerId_idx" ON "CustomerInteraction"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerInteraction_importLegacyId_idx" ON "CustomerInteraction"("importLegacyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportJobError_jobId_idx" ON "ImportJobError"("jobId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ImportJobError" ADD CONSTRAINT "ImportJobError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "customerContactId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
