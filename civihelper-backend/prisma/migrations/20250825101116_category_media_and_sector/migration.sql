-- CreateEnum
CREATE TYPE "public"."SectorType" AS ENUM ('PUBLIC', 'PRIVATE', 'NGO', 'EDUCATION', 'HEALTH', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "sector" "public"."SectorType" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Category_sector_idx" ON "public"."Category"("sector");
