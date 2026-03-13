CREATE TABLE "AutomationSetting" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "scheduleHourEt" INTEGER NOT NULL,
    "scheduleMinuteEt" INTEGER NOT NULL,
    "lastScheduledDateEt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationSetting_jobType_key" ON "AutomationSetting"("jobType");
