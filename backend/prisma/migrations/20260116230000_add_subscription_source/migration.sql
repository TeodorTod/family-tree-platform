-- Add subscription source enum and column to users
CREATE TYPE "SubscriptionSource" AS ENUM ('PAID', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "subscriptionSource" "SubscriptionSource";
