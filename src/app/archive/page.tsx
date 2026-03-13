import Link from "next/link";
import { formatMarketDate } from "@/lib/format";
import {
  getPublishedReports,
  type ArchiveSort
} from "@/server/queries/public-content";

const archiveSortOptions: Array<{ value: ArchiveSort; label: string }> = [
  { value: "recent", label: "Most recent" },
  { value: "events", label: "Most events" },
  { value: "stocks", label: "Most stocks" }
];

interface ArchivePageProps {
  searchParams: Promise<{
    sort?: string;
  }>;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const { sort } = await searchParams;
  const activeSort: ArchiveSort =
    sort === "events" || sort === "stocks" ? sort : "recent";
  const reports = await getPublishedReports(30, activeSort);
  type ReportItem = (typeof reports)[number];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Archive</p>
        <h1>30-day report history.</h1>
        <p className="lede">
          Review the seeded report archive with ranked event counts, stock focus
          coverage, and direct links into each briefing.
        </p>
        <div className="filter-row">
          {archiveSortOptions.map((option: (typeof archiveSortOptions)[number]) => (
            <Link
              className={`filter-chip ${activeSort === option.value ? "filter-chip-active" : ""}`}
              href={
                option.value === "recent"
                  ? { pathname: "/archive" }
                  : { pathname: "/archive", query: { sort: option.value } }
              }
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="stack-list">
          {reports.map((report: ReportItem) => (
            <article className="list-card" key={report.id}>
              <div className="list-card-topline">
                <span>{formatMarketDate(report.marketDate)}</span>
                <span>{report.events.length} events</span>
                <span>{report.stockFocuses.length} stocks</span>
              </div>
              <h2>{report.title}</h2>
              <p>{report.summary}</p>
              <Link className="inline-link" href={`/reports/${report.slug}`}>
                Open report
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
