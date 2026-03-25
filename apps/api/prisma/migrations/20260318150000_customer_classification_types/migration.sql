-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "CustomerClassification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelHe" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerClassification_code_key" ON "CustomerClassification"("code");

-- Preset סיווגים (תואמים לערכי enum קודמים)
INSERT INTO "CustomerClassification" ("id", "code", "labelHe", "sortOrder", "isPreset", "createdAt") VALUES
('cc000000-0000-4000-8000-000000000001', 'COMPANY', 'חברה / קבלן', 0, true, CURRENT_TIMESTAMP),
('cc000000-0000-4000-8000-000000000002', 'PUBLIC', 'רשות / מוסד', 1, true, CURRENT_TIMESTAMP),
('cc000000-0000-4000-8000-000000000003', 'PRIVATE', 'לקוח פרטי', 2, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- AlterTable: Customer.type enum -> text (only if enum still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerType') THEN
    ALTER TABLE "Customer" ALTER COLUMN "type" TYPE TEXT USING ("type"::text);
    DROP TYPE "CustomerType";
  END IF;
END $$;
