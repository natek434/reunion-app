-- CreateEnum
CREATE TYPE "public"."ResourceKind" AS ENUM ('pdf', 'doc', 'sheet', 'image', 'video', 'audio', 'link', 'zip', 'other');

-- CreateTable
CREATE TABLE "public"."Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "public"."ResourceKind" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filePath" TEXT,
    "externalUrl" TEXT,
    "sizeBytes" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_kind_idx" ON "public"."Resource"("kind");

-- CreateIndex
CREATE INDEX "Resource_updatedAt_idx" ON "public"."Resource"("updatedAt");
