ALTER TABLE "JobRun"
ADD COLUMN "triggerSource" TEXT,
ADD COLUMN "aiProvider" TEXT,
ADD COLUMN "aiModel" TEXT,
ADD COLUMN "reportSlug" TEXT,
ADD COLUMN "promptTokens" INTEGER,
ADD COLUMN "completionTokens" INTEGER,
ADD COLUMN "totalTokens" INTEGER;

CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
