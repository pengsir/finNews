import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMarketDate, toIsoMarketDate } from "@/lib/format";
import { getTopicPageData } from "@/server/queries/public-content";

interface TopicPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = await getTopicPageData(slug);

  if (!topic.topicLabel) {
    notFound();
  }

  type TopicReport = (typeof topic.reports)[number];
  type MatchingEventLink = (typeof topic.reports)[number]["matchingEvents"][number];
  type RelatedStock = (typeof topic.relatedStocks)[number];
  const totalEventCount = topic.reports.reduce(
    (sum, report) => sum + report.matchingEvents.length,
    0
  );
  const totalImportance = topic.reports.reduce(
    (sum, report: (typeof topic.reports)[number]) =>
      sum +
      report.matchingEvents.reduce(
        (eventSum, link: (typeof report.matchingEvents)[number]) => eventSum + link.event.importanceScore,
        0
      ),
    0
  );
  const averageImportance =
    totalEventCount > 0 ? (totalImportance / totalEventCount).toFixed(1) : "0.0";
  const recentDates = topic.reports.slice(0, 3).map((report: (typeof topic.reports)[number]) => ({
    label: formatMarketDate(report.marketDate),
    date: toIsoMarketDate(report.marketDate)
  }));

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Topic desk</p>
        <h1>{topic.topicLabel}</h1>
        <p className="lede">
          Cross-report coverage for the {topic.topicLabel} theme, with the most recent briefs and evidence-linked event summaries collected in one place.
        </p>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Coverage snapshot</p>
          <h2>How this theme is moving through the publication.</h2>
        </div>
        <div className="summary-grid">
          <article className="detail-card">
            <p className="eyebrow">Coverage stats</p>
            <div className="summary-stat-grid">
              <div className="summary-stat">
                <strong>{topic.reports.length}</strong>
                <span>Published editions</span>
              </div>
              <div className="summary-stat">
                <strong>{totalEventCount}</strong>
                <span>Matching events</span>
              </div>
              <div className="summary-stat">
                <strong>{averageImportance}</strong>
                <span>Average importance</span>
              </div>
            </div>
          </article>
          <article className="detail-card">
            <p className="eyebrow">Recent editions</p>
            <div className="summary-stack">
              {recentDates.map((edition: (typeof recentDates)[number]) => (
                <Link
                  className="summary-chip"
                  href={`/editions/${edition.date}`}
                  key={edition.date}
                >
                  <span>{edition.label}</span>
                  <span>Open edition</span>
                </Link>
              ))}
            </div>
          </article>
          <article className="detail-card">
            <p className="eyebrow">Desk note</p>
            <p className="muted-copy">
              This page groups every published report where the {topic.topicLabel} thread was important enough to enter the final ranked event stack.
            </p>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Recent coverage</p>
          <h2>Published editions carrying this theme.</h2>
        </div>
        <div className="stack-list">
          {topic.reports.map((report: TopicReport) => (
            <article className="list-card" key={report.id}>
              <div className="list-card-topline">
                <span>{formatMarketDate(report.marketDate)}</span>
                <span>{report.matchingEvents.length} matching events</span>
                <span>{report.stockFocuses.length} stock notes</span>
              </div>
              <h2>{report.title}</h2>
              <p>{report.summary}</p>
              <div className="topic-event-list">
                {report.matchingEvents.slice(0, 3).map((link: MatchingEventLink) => (
                  <Link className="topic-event-link" href={`/news/${link.event.slug}`} key={link.event.id}>
                    <strong>{link.event.title}</strong>
                    <span>{link.event.summary}</span>
                  </Link>
                ))}
              </div>
              <div className="hero-actions">
                <Link className="inline-link" href={`/reports/${report.slug}`}>
                  Open report
                </Link>
                <Link
                  className="inline-link"
                  href={`/editions/${toIsoMarketDate(report.marketDate)}`}
                >
                  Open date page
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {topic.relatedStocks.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Related stocks</p>
            <h2>Tickers repeatedly surfacing in this topic.</h2>
          </div>
          <div className="card-grid">
            {topic.relatedStocks.map((stock: RelatedStock) => (
              <article className="card stock-focus-card" key={stock.id}>
                <p className="eyebrow">Ticker</p>
                <h2>{stock.symbol}</h2>
                {stock.company ? <p className="stock-focus-company">{stock.company}</p> : null}
                <p>{stock.thesis}</p>
                <Link className="inline-link" href={`/stocks/${stock.symbol}`}>
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
