/*
  Warnings:

  - A unique constraint covering the columns `[userId,serviceId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ServiceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."ServiceStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "public"."Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "public"."Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_serviceId_idx" ON "public"."Favorite"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_serviceId_key" ON "public"."Favorite"("userId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_serviceId_key" ON "public"."Review"("userId", "serviceId");

-- CreateIndex
CREATE INDEX "Service_status_deletedAt_idx" ON "public"."Service"("status", "deletedAt");

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
