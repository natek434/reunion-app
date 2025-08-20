-- Safe backfill for Person.createdById (PostgreSQL)
BEGIN;

-- 1) Create a system user ONLY if there are no users at all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "User") THEN
    INSERT INTO "User" ("id","email","name","role","createdAt","updatedAt")
    VALUES ('system', 'system@local', 'System', 'ADMIN'::"Role", NOW(), NOW());
  END IF;
END $$;

-- 2) Add column as NULLABLE first (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Person' AND column_name = 'createdById'
  ) THEN
    ALTER TABLE "Person" ADD COLUMN "createdById" TEXT;
  END IF;
END $$;

-- 3) Backfill from linked user (User.personId = Person.id)
UPDATE "Person" p
SET "createdById" = u."id"
FROM "User" u
WHERE u."personId" = p."id"
  AND (p."createdById" IS NULL OR p."createdById" = '');

-- 4) Backfill remaining NULLs to an ADMIN (else earliest user, else 'system')
WITH pick AS (
  SELECT COALESCE(
    (SELECT "id" FROM "User" WHERE "role" = 'ADMIN'::"Role" ORDER BY "createdAt" ASC LIMIT 1),
    (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1),
    'system'
  ) AS uid
)
UPDATE "Person" p
SET "createdById" = (SELECT uid FROM pick)
WHERE p."createdById" IS NULL OR p."createdById" = '';

-- 5) Enforce NOT NULL
ALTER TABLE "Person" ALTER COLUMN "createdById" SET NOT NULL;

-- 6) Ensure FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Person_createdById_fkey'
  ) THEN
    ALTER TABLE "Person"
      ADD CONSTRAINT "Person_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
