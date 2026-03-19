/*
  Warnings:

  - You are about to drop the column `description` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `pdfPath` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `quoteNumber` on the `Quote` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Quote_quoteNumber_key";

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "description",
DROP COLUMN "pdfPath",
DROP COLUMN "quoteNumber";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "phone" TEXT;
