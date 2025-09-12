/*
  Warnings:

  - A unique constraint covering the columns `[partnerId]` on the table `FamilyMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,role]` on the table `FamilyMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fromMemberId,toMemberId,type]` on the table `Relationship` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."FamilyMember" DROP CONSTRAINT "FamilyMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Media" DROP CONSTRAINT "Media_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MemberProfile" DROP CONSTRAINT "MemberProfile_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Relationship" DROP CONSTRAINT "Relationship_fromMemberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Relationship" DROP CONSTRAINT "Relationship_toMemberId_fkey";

-- AlterTable
ALTER TABLE "public"."Relationship" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_partnerId_key" ON "public"."FamilyMember"("partnerId");

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "public"."FamilyMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_userId_role_key" ON "public"."FamilyMember"("userId", "role");

-- CreateIndex
CREATE INDEX "Media_memberId_idx" ON "public"."Media"("memberId");

-- CreateIndex
CREATE INDEX "Relationship_fromMemberId_idx" ON "public"."Relationship"("fromMemberId");

-- CreateIndex
CREATE INDEX "Relationship_toMemberId_idx" ON "public"."Relationship"("toMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_fromMemberId_toMemberId_type_key" ON "public"."Relationship"("fromMemberId", "toMemberId", "type");

-- AddForeignKey
ALTER TABLE "public"."FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Relationship" ADD CONSTRAINT "Relationship_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Relationship" ADD CONSTRAINT "Relationship_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberProfile" ADD CONSTRAINT "MemberProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
