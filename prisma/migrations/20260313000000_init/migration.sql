-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawNewsItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "language" TEXT,
    "publishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "content" TEXT,
    "importanceHint" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawNewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT,
    "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sectors" TEXT[] NOT NULL,
    "tickers" TEXT[] NOT NULL,
    "marketDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEventSource" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rawNewsItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEventSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "marketDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "contentZhEn" TEXT NOT NULL,
    "sentimentSummary" TEXT,
    "sectorView" TEXT,
    "tradingView" TEXT,
    "riskWarning" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DailyReportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockFocus" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "company" TEXT,
    "thesis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockFocus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualEditLog" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "editorLabel" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_slug_key" ON "NewsSource"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RawNewsItem_url_key" ON "RawNewsItem"("url");

-- CreateIndex
CREATE INDEX "RawNewsItem_sourceId_publishedAt_idx" ON "RawNewsItem"("sourceId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_slug_key" ON "NewsEvent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEventSource_eventId_rawNewsItemId_key" ON "NewsEventSource"("eventId", "rawNewsItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_slug_key" ON "DailyReport"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_marketDate_key" ON "DailyReport"("marketDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReportEvent_reportId_eventId_key" ON "DailyReportEvent"("reportId", "eventId");

-- CreateIndex
CREATE INDEX "DailyReportEvent_reportId_sortOrder_idx" ON "DailyReportEvent"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "StockFocus_symbol_idx" ON "StockFocus"("symbol");

-- CreateIndex
CREATE INDEX "JobRun_jobType_createdAt_idx" ON "JobRun"("jobType", "createdAt");

-- CreateIndex
CREATE INDEX "ManualEditLog_reportId_createdAt_idx" ON "ManualEditLog"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "RawNewsItem" ADD CONSTRAINT "RawNewsItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsEventSource" ADD CONSTRAINT "NewsEventSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsEventSource" ADD CONSTRAINT "NewsEventSource_rawNewsItemId_fkey" FOREIGN KEY ("rawNewsItemId") REFERENCES "RawNewsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportEvent" ADD CONSTRAINT "DailyReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReportEvent" ADD CONSTRAINT "DailyReportEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockFocus" ADD CONSTRAINT "StockFocus_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEditLog" ADD CONSTRAINT "ManualEditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
