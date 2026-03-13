ALTER TABLE "AiProviderConfig"
ADD COLUMN "label" TEXT NOT NULL DEFAULT 'Primary',
ADD COLUMN "apiKey" TEXT;

CREATE TABLE "ReportPageView" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportPageView_reportId_createdAt_idx" ON "ReportPageView"("reportId", "createdAt");

ALTER TABLE "ReportPageView"
ADD CONSTRAINT "ReportPageView_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
