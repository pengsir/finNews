import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMarketDate } from "@/lib/format";
import { getNewsEventByIdOrSlug } from "@/server/queries/public-content";

interface NewsDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const event = await getNewsEventByIdOrSlug(id);

  if (!event) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">News Event</p>
        <h1>{event.title}</h1>
        <p className="lede">{event.summary}</p>
        <div className="hero-meta">
          <span>{event.sentiment ?? "neutral"}</span>
          <span>{event.importanceScore.toFixed(1)} / 10</span>
          <span>{event.sources.length} source items</span>
        </div>
      </section>

      <section className="section-block">
        <div className="content-grid">
          <article className="feature-card">
            <p className="eyebrow">Merged event</p>
            <div className="tag-row">
              {event.sectors.map((sector) => (
                <span className="tag" key={sector}>
                  {sector}
                </span>
              ))}
              {event.tickers.map((ticker) => (
                <span className="tag" key={ticker}>
                  {ticker}
                </span>
              ))}
            </div>
            {event.marketDate ? (
              <p className="muted-copy">Market date: {formatMarketDate(event.marketDate)}</p>
            ) : null}
          </article>

          <aside className="detail-panel">
            <div className="detail-card">
              <p className="eyebrow">Appears in reports</p>
              {event.reportLinks.length > 0 ? (
                <div className="stack-links">
                  {event.reportLinks.map(({ report }) => (
                    <Link className="inline-link" href={`/reports/${report.slug}`} key={report.id}>
                      {report.title}
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No linked reports yet.</p>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Sources</p>
          <h2>Original items preserved as evidence.</h2>
        </div>
        <div className="stack-list">
          {event.sources.map(({ id: linkId, rawNewsItem }) => (
            <article className="list-card" key={linkId}>
              <div className="list-card-topline">
                <span>{rawNewsItem.source.name}</span>
                <span>{rawNewsItem.language ?? "n/a"}</span>
                <span>
                  {rawNewsItem.publishedAt
                    ? formatMarketDate(rawNewsItem.publishedAt)
                    : "No publish date"}
                </span>
              </div>
              <h3>{rawNewsItem.title}</h3>
              <p>{rawNewsItem.summary ?? "No summary available."}</p>
              <a className="inline-link" href={rawNewsItem.url} target="_blank" rel="noreferrer">
                Open source article
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
