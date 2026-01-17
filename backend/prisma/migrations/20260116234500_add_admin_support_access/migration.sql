-- Add admin support access flag to user settings
ALTER TABLE "UserSettings"
ADD COLUMN "allowAdminSupportAccess" BOOLEAN NOT NULL DEFAULT false;
