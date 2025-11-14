-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
