/*
  Warnings:

  - You are about to drop the column `endDate` on the `Partnership` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Partnership` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Partnership` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personAId,personBId,createdAt]` on the table `Partnership` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'EDITOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."ParentRole" AS ENUM ('MOTHER', 'FATHER', 'PARENT');

-- DropIndex
DROP INDEX "public"."Partnership_personAId_personBId_key";

-- AlterTable
ALTER TABLE "public"."ParentChild" ADD COLUMN     "role" "public"."ParentRole" NOT NULL DEFAULT 'PARENT';

-- AlterTable
ALTER TABLE "public"."Partnership" DROP COLUMN "endDate",
DROP COLUMN "notes",
DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "public"."Person" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "ParentChild_parentId_idx" ON "public"."ParentChild"("parentId");

-- CreateIndex
CREATE INDEX "ParentChild_childId_idx" ON "public"."ParentChild"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_personAId_personBId_createdAt_key" ON "public"."Partnership"("personAId", "personBId", "createdAt");

-- CreateIndex
CREATE INDEX "Person_deletedAt_idx" ON "public"."Person"("deletedAt");
