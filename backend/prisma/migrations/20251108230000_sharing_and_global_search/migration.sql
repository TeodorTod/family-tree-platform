-- CreateEnum
CREATE TYPE "public"."ShareRequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED');

-- AlterTable FamilyMember
ALTER TABLE "public"."FamilyMember"
ADD COLUMN     "copiedFromMemberId" TEXT,
ADD COLUMN     "copiedSnapshotAt" TIMESTAMP(3);

-- Indexes for FamilyMember
CREATE INDEX IF NOT EXISTS "FamilyMember_isAlive_idx" ON "public"."FamilyMember"("isAlive");
CREATE INDEX IF NOT EXISTS "FamilyMember_dod_idx" ON "public"."FamilyMember"("dod");
CREATE INDEX IF NOT EXISTS "FamilyMember_deathYear_idx" ON "public"."FamilyMember"("deathYear");
CREATE INDEX IF NOT EXISTS "FamilyMember_copiedFromMemberId_idx" ON "public"."FamilyMember"("copiedFromMemberId");

-- FK for copiedFromMemberId
ALTER TABLE "public"."FamilyMember"
ADD CONSTRAINT "FamilyMember_copiedFromMemberId_fkey" FOREIGN KEY ("copiedFromMemberId") REFERENCES "public"."FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable UserSettings
CREATE TABLE "public"."UserSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "allowDeceasedDiscoveryDefault" BOOLEAN NOT NULL DEFAULT true,
  "allowDeceasedDetailsDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings"("userId");
CREATE INDEX "UserSettings_userId_idx" ON "public"."UserSettings"("userId");

ALTER TABLE "public"."UserSettings"
ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable MemberShareConsent
CREATE TABLE "public"."MemberShareConsent" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "allowDiscovery" BOOLEAN NOT NULL DEFAULT true,
  "allowDetails" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "MemberShareConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberShareConsent_ownerUserId_memberId_key" ON "public"."MemberShareConsent"("ownerUserId","memberId");

ALTER TABLE "public"."MemberShareConsent"
ADD CONSTRAINT "MemberShareConsent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MemberShareConsent"
ADD CONSTRAINT "MemberShareConsent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ShareRequest
CREATE TABLE "public"."ShareRequest" (
  "id" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "targetMemberId" TEXT NOT NULL,
  "status" "public"."ShareRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "ShareRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShareRequest_requesterUserId_idx" ON "public"."ShareRequest"("requesterUserId");
CREATE INDEX "ShareRequest_targetMemberId_idx" ON "public"."ShareRequest"("targetMemberId");
CREATE INDEX "ShareRequest_status_idx" ON "public"."ShareRequest"("status");

ALTER TABLE "public"."ShareRequest"
ADD CONSTRAINT "ShareRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ShareRequest"
ADD CONSTRAINT "ShareRequest_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "public"."FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ShareRequest"
ADD CONSTRAINT "ShareRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

