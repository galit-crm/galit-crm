-- CreateTable
CREATE TABLE IF NOT EXISTS "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "introHtml" TEXT,
    "bodyHtml" TEXT,
    "closingHtml" TEXT,
    "termsHtml" TEXT,
    "variablesHelp" TEXT,
    "defaultLineItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuoteTemplate_serviceType_idx" ON "QuoteTemplate"("serviceType");
CREATE INDEX IF NOT EXISTS "QuoteTemplate_isActive_idx" ON "QuoteTemplate"("isActive");

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "quoteTemplateId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contentHtml" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "lineItemsJson" JSONB;

DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_quoteTemplateId_fkey" FOREIGN KEY ("quoteTemplateId") REFERENCES "QuoteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
