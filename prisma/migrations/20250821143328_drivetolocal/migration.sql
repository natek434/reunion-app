/*
  Warnings:

  - You are about to drop the column `driveFileId` on the `GalleryItem` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `GalleryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."GalleryItem" DROP COLUMN "driveFileId",
ADD COLUMN     "fileName" TEXT NOT NULL;
