-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "public"."Promotion" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageKey" TEXT NOT NULL,
    "linkUrl" TEXT,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "public"."Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Promotion_order_createdAt_idx" ON "public"."Promotion"("order", "createdAt");

-- CreateIndex
CREATE INDEX "Promotion_categoryId_idx" ON "public"."Promotion"("categoryId");

-- CreateIndex
CREATE INDEX "Promotion_serviceId_idx" ON "public"."Promotion"("serviceId");

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
