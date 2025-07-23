-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bio" TEXT,
    "coverMediaUrl" TEXT,
    "achievements" JSONB,
    "facts" JSONB,
    "favorites" JSONB,
    "education" JSONB,
    "work" JSONB,
    "personalInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_memberId_key" ON "MemberProfile"("memberId");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
