import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

const validReactions = new Set(["LIKE", "UNLIKE"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as {
      reaction?: string;
      reason?: string;
    };

    const reaction = body.reaction?.toUpperCase();

    if (!reaction || !validReactions.has(reaction)) {
      return NextResponse.json(
        { ok: false, error: "Invalid reaction." },
        { status: 400 }
      );
    }

    const trimmedReason = body.reason?.trim() || null;

    if (reaction === "UNLIKE" && !trimmedReason) {
      return NextResponse.json(
        { ok: false, error: "Reason is required for unlike feedback." },
        { status: 400 }
      );
    }

    const report = await prisma.dailyReport.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "Report not found." },
        { status: 404 }
      );
    }

    await prisma.reportFeedback.create({
      data: {
        reportId: report.id,
        reaction: reaction as "LIKE" | "UNLIKE",
        reason: reaction === "UNLIKE" ? trimmedReason : null
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save report feedback.", error);

    return NextResponse.json(
      { ok: false, error: "Feedback service is temporarily unavailable." },
      { status: 500 }
    );
  }
}
