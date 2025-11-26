-- Add subscription plan enum and fields to users
CREATE TYPE "SubscriptionPlan" AS ENUM ('SIX_MONTHS', 'ONE_YEAR', 'TWO_YEARS');

ALTER TABLE "User"
  ADD COLUMN "subscriptionPlan" "SubscriptionPlan",
  ADD COLUMN "subscriptionStartAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionEndAt" TIMESTAMP(3);
