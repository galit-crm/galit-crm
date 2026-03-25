-- Legacy customer card: Customer scalars + child tables + Document metadata columns

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "legacyAccountNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "legacySubClassificationCode" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "salesRepresentative" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "functionalLabel" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerSize" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "managementProfile" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "countryOrRegion" TEXT;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingAddress" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingCity" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingZip" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingPoBox" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingInvalidField" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowMail" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowFax" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowEmail" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowSms" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mailingNote" TEXT;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "registrationDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "registrationNote" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastUpdateDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastUpdateNote" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastUpdatedBy" TEXT;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "priceList" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "roundedPricing" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "employeeCount" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "managementCustomerLabel" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financialNumber1" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financialNumber2" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financialNumber2Large" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financialNumber3" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeToken" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeTokenDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeTokenActive" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeUnnamed1" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeUnnamed2" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeUnnamed3" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "financeUnnamed4" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "totalPurchases" DECIMAL(18,2);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "totalSales" DECIMAL(18,2);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "percentageValue" DECIMAL(18,4);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditDays" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditEnabled" BOOLEAN;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditExpiry" TEXT;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "microwaveModel" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detectorLocation" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyAmount" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "feature7" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detailDate1" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detailDate3" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detectorModel" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "feature4" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyWall" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "feature8" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detailDate2" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "detailDate4" TIMESTAMP(3);

-- AlterTable Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "documentDate" TIMESTAMP(3);

-- CreateTable CustomerReferralSource
CREATE TABLE IF NOT EXISTS "CustomerReferralSource" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "sourceName" TEXT,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "importLegacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReferralSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerQuestionnaire
CREATE TABLE IF NOT EXISTS "CustomerQuestionnaire" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "questionnaireCode" TEXT,
    "questionnaireName" TEXT,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "importLegacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerRelation
CREATE TABLE IF NOT EXISTS "CustomerRelation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "relatedCustomerName" TEXT,
    "relationType" TEXT,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "importLegacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerAdditionalDataRow
CREATE TABLE IF NOT EXISTS "CustomerAdditionalDataRow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "numberValue" TEXT,
    "dValue" TEXT,
    "dateValue" TIMESTAMP(3),
    "text1" TEXT,
    "text2" TEXT,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "importLegacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAdditionalDataRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerExternalDataRow
CREATE TABLE IF NOT EXISTS "CustomerExternalDataRow" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL DEFAULT 0,
    "colA" TEXT,
    "colB" TEXT,
    "colC" TEXT,
    "colD" TEXT,
    "colE" TEXT,
    "colF" TEXT,
    "colG" TEXT,
    "colH" TEXT,
    "colI" TEXT,
    "colJ" TEXT,
    "importLegacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerExternalDataRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerReferralSource_customerId_idx" ON "CustomerReferralSource"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerQuestionnaire_customerId_idx" ON "CustomerQuestionnaire"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerRelation_customerId_idx" ON "CustomerRelation"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerAdditionalDataRow_customerId_idx" ON "CustomerAdditionalDataRow"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerExternalDataRow_customerId_idx" ON "CustomerExternalDataRow"("customerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerReferralSource_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerReferralSource" ADD CONSTRAINT "CustomerReferralSource_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerQuestionnaire_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerQuestionnaire" ADD CONSTRAINT "CustomerQuestionnaire_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerRelation_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerRelation" ADD CONSTRAINT "CustomerRelation_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerAdditionalDataRow_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerAdditionalDataRow" ADD CONSTRAINT "CustomerAdditionalDataRow_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerExternalDataRow_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerExternalDataRow" ADD CONSTRAINT "CustomerExternalDataRow_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
