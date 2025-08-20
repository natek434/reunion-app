/*
  Warnings:

  - A unique constraint covering the columns `[personAId,personBId,startDate]` on the table `Partnership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Partnership_personAId_personBId_createdAt_key";

-- AlterTable
ALTER TABLE "public"."Partnership" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_personAId_personBId_startDate_key" ON "public"."Partnership"("personAId", "personBId", "startDate");
