-- Add language preference to users so we can persist UI locale per account
ALTER TABLE "User"
ADD COLUMN "language" TEXT NOT NULL DEFAULT 'bg';
