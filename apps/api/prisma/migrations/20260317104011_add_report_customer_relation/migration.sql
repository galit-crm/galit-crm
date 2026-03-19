/*
  Warnings:

  - A unique constraint covering the columns `[quoteNumber]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "description" TEXT,
ADD COLUMN     "pdfPath" TEXT,
ADD COLUMN     "quoteNumber" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
