-- AlterTable: optional street / full address line (city remains separate)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "address" TEXT;
