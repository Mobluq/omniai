CREATE TYPE "MediaAssetStatus" AS ENUM ('ticketed', 'uploaded', 'attached', 'rejected', 'deleted');

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "listingId" TEXT,
  "status" "MediaAssetStatus" NOT NULL DEFAULT 'ticketed',
  "role" "PhotoRole",
  "storageKey" TEXT NOT NULL,
  "uploadUrl" TEXT,
  "publicUrl" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER,
  "checksumSha256" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "qualityScore" INTEGER,
  "metadata" JSONB,
  "expiresAt" TIMESTAMP(3),
  "uploadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ListingPhoto" ADD COLUMN "mediaAssetId" TEXT;

CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_ownerId_status_idx" ON "MediaAsset"("ownerId", "status");
CREATE INDEX "MediaAsset_listingId_idx" ON "MediaAsset"("listingId");
CREATE INDEX "MediaAsset_storageKey_idx" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_expiresAt_idx" ON "MediaAsset"("expiresAt");
CREATE UNIQUE INDEX "ListingPhoto_mediaAssetId_key" ON "ListingPhoto"("mediaAssetId");

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ListingPhoto"
  ADD CONSTRAINT "ListingPhoto_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
