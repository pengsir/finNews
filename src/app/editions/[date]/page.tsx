import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMarketDate, slugifyTopic } from "@/lib/format";
import { getPublishedReportByDate } from "@/server/queries/public-content";

interface EditionPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function EditionPage({ params }: EditionPageProps) {
  const { date } = await params;
  const report = await getPublishedReportByDate(date);

  if (!report) {
    notFound();
  }

  const sectorCounts = new Map<string, number>();
  const tickerCounts = new Map<string, number>();

  for (const { event } of report.events) {
    for (const sector of event.sectors) {
      sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
    }

    for (const ticker of event.tickers) {
      tickerCounts.set(ticker, (tickerCounts.get(ticker) ?? 0) + 1);
    }
  }

  const leadSectors = [...sectorCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4);
  const leadTickers = [...tickerCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Edition</p>
        <h1>{formatMarketDate(report.marketDate)}</h1>
        <p className="lede">
          This edition collected {report.events.length} ranked events and {report.stockFocuses.length} stock focus notes for the pre-market desk.
        </p>
        <div className="hero-actions">
          <Link className="button-link" href={`/reports/${report.slug}`}>
            Read full report
          </Link>
          <Link className="button-link button-link-secondary" href="/archive">
            Back to archive
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Desk snapshot</p>
          <h2>The shape of this edition at a glance.</h2>
        </div>
        <div className="summary-grid">
          <article className="detail-card">
            <p className="eyebrow">Lead sectors</p>
            <div className="summary-stack">
              {leadSectors.map(([sector, count]) => (
                <Link
                  className="summary-chip"
                  href={`/topics/${slugifyTopic(sector)}`}
                  key={sector}
                >
                  <span>{sector}</span>
                  <span>{count} events</span>
                </Link>
              ))}
            </div>
          </article>
          <article className="detail-card">
            <p className="eyebrow">Lead tickers</p>
            <div className="summary-stack">
              {leadTickers.length > 0 ? (
                leadTickers.map(([ticker, count]) => (
                  <Link className="summary-chip" href={`/stocks/${ticker}`} key={ticker}>
                    <span>{ticker}</span>
                    <span>{count} mentions</span>
                  </Link>
                ))
              ) : (
                <p className="muted-copy">No ticker emphasis was extracted for this edition.</p>
              )}
            </div>
          </article>
          <article className="detail-card">
            <p className="eyebrow">Edition markers</p>
            <div className="summary-stat-grid">
              <div className="summary-stat">
                <strong>{report.events.length}</strong>
                <span>Ranked events</span>
              </div>
              <div className="summary-stat">
                <strong>{report.stockFocuses.length}</strong>
                <span>Stock notes</span>
              </div>
              <div className="summary-stat">
                <strong>{leadSectors.length}</strong>
                <span>Active sectors</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Lead stories</p>
          <h2>The event stack for this trading day.</h2>
        </div>
        <div className="stack-list">
          {report.events.map(({ event, sortOrder }) => (
            <article className="list-card" key={event.id}>
              <div className="list-card-topline">
                <span>#{sortOrder}</span>
                <span>{event.sentiment ?? "neutral"}</span>
                <span>{event.importanceScore.toFixed(1)} / 10</span>
              </div>
              <h2>{event.title}</h2>
              <p>{event.summary}</p>
              <div className="tag-row">
                {event.sectors.map((sector) => (
                  <Link
                    className="tag"
                    href={`/topics/${slugifyTopic(sector)}`}
                    key={sector}
                  >
                    {sector}
                  </Link>
                ))}
              </div>
              <Link className="inline-link" href={`/news/${event.slug}`}>
                Open evidence detail
              </Link>
            </article>
          ))}
        </div>
      </section>

      {report.stockFocuses.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Desk follow-up</p>
            <h2>Stocks worth revisiting from this edition.</h2>
          </div>
          <div className="card-grid">
            {report.stockFocuses.map((focus) => (
              <article className="card stock-focus-card" key={focus.id}>
                <p className="eyebrow">Ticker</p>
                <h2>{focus.symbol}</h2>
                {focus.company ? <p className="stock-focus-company">{focus.company}</p> : null}
                <p>{focus.thesis}</p>
                <Link className="inline-link" href={`/stocks/${focus.symbol}`}>
                  Open stock page
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
