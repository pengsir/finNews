import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

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

    await prisma.reportPageView.create({
      data: {
        reportId: report.id
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to track report view.", error);

    return NextResponse.json(
      { ok: false, error: "View tracking failed." },
      { status: 500 }
    );
  }
}
