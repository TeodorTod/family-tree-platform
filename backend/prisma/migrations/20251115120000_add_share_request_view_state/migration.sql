-- CreateTable
CREATE TABLE "ShareRequestViewState" (
    "userId" TEXT NOT NULL,
    "outgoingSeenCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareRequestViewState_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "ShareRequestViewState"
ADD CONSTRAINT "ShareRequestViewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
