-- AlterTable
ALTER TABLE "public"."FamilyMember" ADD COLUMN     "birthNote" TEXT,
ADD COLUMN     "birthYear" INTEGER,
ALTER COLUMN "dob" DROP NOT NULL;
