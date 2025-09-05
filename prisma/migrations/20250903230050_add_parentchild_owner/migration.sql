/* =========
   Enums
   ========= */

-- CreateEnum
CREATE TYPE "public"."PartnershipKind" AS ENUM ('MARRIED', 'PARTNER', 'CIVIL_UNION', 'DE_FACTO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PartnershipStatus" AS ENUM ('ACTIVE', 'SEPARATED', 'DIVORCED', 'WIDOWED', 'ENDED');


/* =======================================
   Person FK (drop + re-add, as Prisma wrote)
   ======================================= */

-- DropForeignKey
ALTER TABLE "public"."Person" DROP CONSTRAINT IF EXISTS "Person_createdById_fkey";


/* =======================================
   ParentChild: createdById + metadata (safe sequence)
   ======================================= */

-- 1) Add columns (createdById as NULLable for now, metadata optional)
ALTER TABLE "public"."ParentChild"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "metadata" JSONB;

-- 2) Backfill createdById
-- Prefer the shared owner if parent and child have the same creator,
-- otherwise default to the child's owner (more conservative).
-- 2) Backfill createdById using a CTE (safe: no pc alias in JOIN)
WITH src AS (
  SELECT
    pc."id",
    p."createdById" AS parent_owner,
    c."createdById" AS child_owner
  FROM "public"."ParentChild" pc
  LEFT JOIN "public"."Person" p ON p."id" = pc."parentId"
  LEFT JOIN "public"."Person" c ON c."id" = pc."childId"
)
UPDATE "public"."ParentChild" pc
SET "createdById" = CASE
  WHEN src.parent_owner IS NOT NULL AND src.parent_owner = src.child_owner THEN src.parent_owner
  WHEN src.child_owner IS NOT NULL THEN src.child_owner
  ELSE src.parent_owner
END
FROM src
WHERE src."id" = pc."id";


-- 3) Safety net: if anything is still NULL, assign to your admin user
UPDATE "public"."ParentChild"
SET "createdById" = 'cme997aja00007krc0z4ezt9b'
WHERE "createdById" IS NULL;

-- 4) Index + FK on createdById
CREATE INDEX IF NOT EXISTS "ParentChild_createdById_idx"
  ON "public"."ParentChild"("createdById");

ALTER TABLE "public"."ParentChild"
  ADD CONSTRAINT "ParentChild_createdById_fkey"
  FOREIGN KEY ("createdById")
  REFERENCES "public"."User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 5) Now enforce NOT NULL
ALTER TABLE "public"."ParentChild"
  ALTER COLUMN "createdById" SET NOT NULL;


/* =======================================
   Partnership table + indexes + FKs
   ======================================= */

-- CreateTable
CREATE TABLE "public"."Partnership" (
  "id"           TEXT NOT NULL,
  "aId"          TEXT NOT NULL,
  "bId"          TEXT NOT NULL,
  "kind"         "public"."PartnershipKind"   NOT NULL DEFAULT 'PARTNER',
  "status"       "public"."PartnershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate"    TIMESTAMP(3),
  "endDate"      TIMESTAMP(3),
  "metadata"     JSONB,
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Partnership_aId_idx"         ON "public"."Partnership"("aId");
CREATE INDEX "Partnership_bId_idx"         ON "public"."Partnership"("bId");
CREATE INDEX "Partnership_createdById_idx" ON "public"."Partnership"("createdById");

-- Prevent duplicate pairs (assumes canonical (aId,bId) ordering at app layer)
CREATE UNIQUE INDEX "Partnership_aId_bId_key" ON "public"."Partnership"("aId", "bId");

-- Foreign Keys
ALTER TABLE "public"."Partnership"
  ADD CONSTRAINT "Partnership_aId_fkey"
  FOREIGN KEY ("aId") REFERENCES "public"."Person"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Partnership"
  ADD CONSTRAINT "Partnership_bId_fkey"
  FOREIGN KEY ("bId") REFERENCES "public"."Person"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Partnership"
  ADD CONSTRAINT "Partnership_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "public"."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;


/* =======================================
   Person: re-add FK + index (as Prisma wrote)
   ======================================= */

-- Keep a handy index for owner lookups
CREATE INDEX IF NOT EXISTS "Person_createdById_idx" ON "public"."Person"("createdById");

-- Re-add FK on Person.createdById (CASCADE)
ALTER TABLE "public"."Person"
  ADD CONSTRAINT "Person_createdById_fkey"
  FOREIGN KEY ("createdById")
  REFERENCES "public"."User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;


/* =======================================
   (Optional) extra safety checks (uncomment if desired)
   ======================================= */

-- Prevent self parent-child edges:
-- ALTER TABLE "public"."ParentChild"
--   ADD CONSTRAINT "pc_not_self" CHECK ("parentId" <> "childId");

-- Prevent self partnerships:
-- ALTER TABLE "public"."Partnership"
--   ADD CONSTRAINT "part_not_self" CHECK ("aId" <> "bId");
