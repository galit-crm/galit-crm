/*
  Warnings:

  - You are about to drop the column `name` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Quote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `firstName` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "name",
ADD COLUMN     "assignee" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "service" DROP NOT NULL,
ALTER COLUMN "source" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Quote";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "User";
