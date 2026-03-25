-- ייבוא מ-CRM ישן: מזהה חיצוני לקישור ולמניעת כפילויות
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "importLegacyId" TEXT;

CREATE INDEX IF NOT EXISTS "Customer_importLegacyId_idx" ON "Customer"("importLegacyId");
CREATE INDEX IF NOT EXISTS "Lead_importLegacyId_idx" ON "Lead"("importLegacyId");
CREATE INDEX IF NOT EXISTS "Quote_importLegacyId_idx" ON "Quote"("importLegacyId");
CREATE INDEX IF NOT EXISTS "Project_importLegacyId_idx" ON "Project"("importLegacyId");
CREATE INDEX IF NOT EXISTS "Report_importLegacyId_idx" ON "Report"("importLegacyId");
CREATE INDEX IF NOT EXISTS "Document_importLegacyId_idx" ON "Document"("importLegacyId");
