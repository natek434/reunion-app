-- CreateEnum
CREATE TYPE "public"."RelationshipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."RelationshipRequestKind" AS ENUM ('PARENT_CHILD', 'PARTNERSHIP');

-- CreateTable
CREATE TABLE "public"."RelationshipRequest" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "kind" "public"."RelationshipRequestKind" NOT NULL,
    "role" TEXT,
    "pcKind" TEXT,
    "status" "public"."RelationshipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "openHash" TEXT NOT NULL,

    CONSTRAINT "RelationshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipRequest_openHash_key" ON "public"."RelationshipRequest"("openHash");

-- CreateIndex
CREATE INDEX "RelationshipRequest_approverUserId_status_idx" ON "public"."RelationshipRequest"("approverUserId", "status");

-- CreateIndex
CREATE INDEX "RelationshipRequest_fromPersonId_toPersonId_idx" ON "public"."RelationshipRequest"("fromPersonId", "toPersonId");

