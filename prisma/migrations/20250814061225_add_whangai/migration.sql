/*
  Warnings:

  - A unique constraint covering the columns `[parentId,childId,kind]` on the table `ParentChild` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[childId,kind,role]` on the table `ParentChild` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ParentKind" AS ENUM ('BIOLOGICAL', 'WHANGAI');

-- DropIndex
DROP INDEX "public"."ParentChild_childId_role_key";

-- DropIndex
DROP INDEX "public"."ParentChild_parentId_childId_key";

-- AlterTable
ALTER TABLE "public"."ParentChild" ADD COLUMN     "kind" "public"."ParentKind" NOT NULL DEFAULT 'BIOLOGICAL';

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_parentId_childId_kind_key" ON "public"."ParentChild"("parentId", "childId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_childId_kind_role_key" ON "public"."ParentChild"("childId", "kind", "role");
