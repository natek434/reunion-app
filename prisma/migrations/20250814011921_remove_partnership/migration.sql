/*
  Warnings:

  - The values [PARENT] on the enum `ParentRole` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `ParentChild` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `Partnership` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[parentId,childId]` on the table `ParentChild` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[childId,role]` on the table `ParentChild` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `ParentChild` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ParentRole_new" AS ENUM ('MOTHER', 'FATHER');
ALTER TABLE "public"."ParentChild" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."ParentChild" ALTER COLUMN "role" TYPE "public"."ParentRole_new" USING ("role"::text::"public"."ParentRole_new");
ALTER TYPE "public"."ParentRole" RENAME TO "ParentRole_old";
ALTER TYPE "public"."ParentRole_new" RENAME TO "ParentRole";
DROP TYPE "public"."ParentRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Partnership" DROP CONSTRAINT "Partnership_personAId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Partnership" DROP CONSTRAINT "Partnership_personBId_fkey";

-- AlterTable
ALTER TABLE "public"."ParentChild" DROP CONSTRAINT "ParentChild_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "role" DROP DEFAULT,
ADD CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "public"."Partnership";

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_parentId_childId_key" ON "public"."ParentChild"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_childId_role_key" ON "public"."ParentChild"("childId", "role");
