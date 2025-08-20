-- AlterEnum
ALTER TYPE "public"."ParentRole" ADD VALUE 'PARENT';

-- AlterTable
ALTER TABLE "public"."Person" ADD COLUMN     "displayName" TEXT;
