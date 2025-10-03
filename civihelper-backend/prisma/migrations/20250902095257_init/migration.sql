/*
  Warnings:

  - You are about to drop the column `coverUrl` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `iconUrl` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Category" DROP COLUMN "coverUrl",
DROP COLUMN "icon",
DROP COLUMN "iconUrl",
ADD COLUMN     "imageThumbUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN     "coverThumbUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."ServiceImage" ADD COLUMN     "thumbUrl" TEXT;

-- CreateIndex
CREATE INDEX "Service_city_categoryId_idx" ON "public"."Service"("city", "categoryId");

-- CreateIndex
CREATE INDEX "Service_serviceTypeId_city_idx" ON "public"."Service"("serviceTypeId", "city");
