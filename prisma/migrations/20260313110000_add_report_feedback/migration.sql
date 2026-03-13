CREATE TYPE "FeedbackReaction" AS ENUM ('LIKE', 'UNLIKE');

CREATE TABLE "ReportFeedback" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reaction" "FeedbackReaction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportFeedback_reportId_createdAt_idx" ON "ReportFeedback"("reportId", "createdAt");
CREATE INDEX "ReportFeedback_reportId_reaction_idx" ON "ReportFeedback"("reportId", "reaction");

ALTER TABLE "ReportFeedback"
ADD CONSTRAINT "ReportFeedback_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
