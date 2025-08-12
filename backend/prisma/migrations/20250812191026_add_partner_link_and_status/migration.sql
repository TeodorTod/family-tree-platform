-- CreateEnum
CREATE TYPE "public"."PartnerStatus" AS ENUM ('MARRIED', 'DIVORCED', 'SEPARATED', 'WIDOWED', 'ENGAGED', 'PARTNERS', 'FRIENDS', 'ANNULLED', 'UNKNOWN', 'OTHER');

-- AlterTable
ALTER TABLE "public"."FamilyMember" ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "partnerStatus" "public"."PartnerStatus";

-- AddForeignKey
ALTER TABLE "public"."FamilyMember" ADD CONSTRAINT "FamilyMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
