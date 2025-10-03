-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarThumbUrl" TEXT,
ADD COLUMN     "avatarUrl" TEXT;

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");
