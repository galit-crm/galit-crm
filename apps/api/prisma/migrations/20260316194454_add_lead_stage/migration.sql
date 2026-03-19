-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'NEGOTIATION', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "stage" "LeadStage" NOT NULL DEFAULT 'NEW';
