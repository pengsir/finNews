import Link from "next/link";
import { formatMarketDate } from "@/lib/format";
import { getLatestPublishedReport } from "@/server/queries/public-content";

const sections = [
  {
    title: "Daily briefing",
    body: "A lead-market note built for the hour before the U.S. open, with the signal surfaced first and noise pushed out."
  },
  {
    title: "Evidence-led analysis",
    body: "Every conclusion is tied back to merged event clusters and the underlying source headlines that shaped the draft."
  },
  {
    title: "Editorial workflow",
    body: "Source ingestion, AI generation, and final publishing are designed to feel like a newsroom pipeline, not a toy demo."
  }
];

export default async function HomePage() {
  const latestReport = await getLatestPublishedReport();

  return (
    <main className="page-shell">
      <section className="hero hero-home">
        <p className="eyebrow">Fin News</p>
        <h1 className="hero-home-title">
          {latestReport
            ? latestReport.title
            : "Professional pre-market intelligence for a faster opening read."}
        </h1>
        <p className="lede hero-home-lede">
          {latestReport
            ? latestReport.summary
            : "A newsroom-style finance brief built from ranked market events, bilingual AI analysis, and a traceable evidence chain prepared before 9:00 AM ET."}
        </p>
        {latestReport ? (
          <div className="hero-meta">
            <span>{formatMarketDate(latestReport.marketDate)}</span>
            <span>{latestReport.events.length} ranked events</span>
            <span>{latestReport.stockFocuses.length} stock focus picks</span>
          </div>
        ) : null}
        <div className="hero-actions">
          {latestReport ? (
            <Link className="button-link" href={`/reports/${latestReport.slug}`}>
              Read latest report
            </Link>
          ) : null}
          <Link className="button-link button-link-secondary" href="/archive">
            Browse archive
          </Link>
        </div>
      </section>

      <section className="card-grid" aria-label="Platform overview">
        {sections.map((section: (typeof sections)[number]) => (
          <article className="card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      {latestReport ? (
        <>
          <section className="section-block">
            <div className="section-heading">
              <p className="eyebrow">Top events</p>
              <h2>What is driving the current mock pre-market brief.</h2>
            </div>
            <div className="stack-list">
              {latestReport.events.map((link: (typeof latestReport.events)[number], index) => (
                <article className="list-card" key={link.event.id}>
                  <div className="list-card-topline">
                    <span>#{index + 1}</span>
                    <span>{link.event.sentiment ?? "neutral"}</span>
                    <span>{link.event.importanceScore.toFixed(1)} / 10</span>
                  </div>
                  <h3>{link.event.title}</h3>
                  <p>{link.event.summary}</p>
                  <div className="tag-row">
                    {link.event.sectors.map((sector: string) => (
                      <span className="tag" key={sector}>
                        {sector}
                      </span>
                    ))}
                  </div>
                  <Link className="inline-link" href={`/news/${link.event.slug}`}>
                    View evidence
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <p className="eyebrow">Stock focus</p>
              <h2>Symbols pulled into the report narrative.</h2>
            </div>
            <div className="card-grid">
              {latestReport.stockFocuses.map((focus: (typeof latestReport.stockFocuses)[number]) => (
                <article className="card" key={focus.id}>
                  <h2>{focus.symbol}</h2>
                  <p>{focus.thesis}</p>
                  <Link className="inline-link" href={`/stocks/${focus.symbol}`}>
                    Open stock page
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
