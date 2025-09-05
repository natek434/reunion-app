-- CreateTable
CREATE TABLE "public"."AlbumItem" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "galleryItemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AlbumItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlbumItem_albumId_idx" ON "public"."AlbumItem"("albumId");

-- CreateIndex
CREATE INDEX "AlbumItem_galleryItemId_idx" ON "public"."AlbumItem"("galleryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AlbumItem_albumId_galleryItemId_key" ON "public"."AlbumItem"("albumId", "galleryItemId");

-- AddForeignKey
ALTER TABLE "public"."AlbumItem" ADD CONSTRAINT "AlbumItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlbumItem" ADD CONSTRAINT "AlbumItem_galleryItemId_fkey" FOREIGN KEY ("galleryItemId") REFERENCES "public"."GalleryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Album" ADD CONSTRAINT "Album_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
