import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMarketDate } from "@/lib/format";
import { ReportFeedbackBar } from "@/components/report-feedback-bar";
import { ReportViewTracker } from "@/components/report-view-tracker";
import { getReportBySlug } from "@/server/queries/public-content";

function parseReportContent(content: string) {
  const paragraphs = content
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const evidenceIndex = paragraphs.findIndex((paragraph) =>
    paragraph.startsWith("EN: Evidence trail used for this draft:")
  );

  if (evidenceIndex === -1) {
    return {
      narrative: paragraphs,
      evidenceLines: []
    };
  }

  return {
    narrative: paragraphs.slice(0, evidenceIndex),
    evidenceLines: paragraphs.slice(evidenceIndex + 1).filter((paragraph) => paragraph.startsWith("- "))
  };
}

function splitDetailLines(content: string | null) {
  return (content ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

interface ReportPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = await getReportBySlug(slug);

  if (!report) {
    notFound();
  }

  type ReportEventLink = (typeof report.events)[number];
  type EventSourceLink = (typeof report.events)[number]["event"]["sources"][number];
  type StockFocus = (typeof report.stockFocuses)[number];
  const parsedContent = parseReportContent(report.contentZhEn);
  const sectorLines = splitDetailLines(report.sectorView);
  const tradingLines = splitDetailLines(report.tradingView);
  const riskLines = splitDetailLines(report.riskWarning);
  const disclaimerLines = splitDetailLines(report.disclaimer);

  return (
    <main className="page-shell">
      <ReportViewTracker reportSlug={report.slug} />
      <section className="hero">
        <p className="eyebrow">Report</p>
        <h1>{report.title}</h1>
        <p className="lede">{report.summary}</p>
        <div className="hero-meta">
          <span>{formatMarketDate(report.marketDate)}</span>
          <span>{report.events.length} cited events</span>
          <span>{report.stockFocuses.length} stock focus items</span>
        </div>
        <ReportFeedbackBar reportSlug={report.slug} />
      </section>

      <section className="section-block">
        <div className="content-grid">
          <article className="feature-card">
            <p className="eyebrow">Bilingual brief</p>
            <div className="prose-block">
              {parsedContent.narrative.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="detail-panel">
            <div className="detail-card">
              <p className="eyebrow">Market sentiment</p>
              <p>{report.sentimentSummary ?? "Not generated yet."}</p>
            </div>
            <div className="detail-card">
              <p className="eyebrow">Sector view</p>
              <div className="detail-list">
                {(sectorLines.length > 0 ? sectorLines : ["Not generated yet."]).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="detail-card">
              <p className="eyebrow">Trading view</p>
              <div className="detail-list">
                {(tradingLines.length > 0 ? tradingLines : ["Not generated yet."]).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="detail-card">
              <p className="eyebrow">Risk warning</p>
              <div className="detail-list detail-list-caution">
                {riskLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="detail-card">
              <p className="eyebrow">Disclaimer</p>
              <div className="detail-list">
                {disclaimerLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {parsedContent.evidenceLines.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">AI evidence trail</p>
            <h2>Source lines fed into the generated draft.</h2>
          </div>
          <div className="stack-list">
            {parsedContent.evidenceLines.map((line) => (
              <article className="evidence-line-card" key={line}>
                <p>{line.replace(/^- /, "")}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Evidence trail</p>
          <h2>Events and source cards behind the report.</h2>
        </div>
        <div className="stack-list">
          {report.events.map((link: ReportEventLink) => (
            <article className="list-card" key={link.event.id}>
              <div className="list-card-topline">
                <span>#{link.sortOrder}</span>
                <span>{link.event.sentiment ?? "neutral"}</span>
                <span>{link.event.sources.length} linked sources</span>
              </div>
              <h3>{link.event.title}</h3>
              <p>{link.event.summary}</p>
              <div className="tag-row">
                {link.event.tickers.map((ticker) => (
                  <span className="tag" key={ticker}>
                    {ticker}
                  </span>
                ))}
              </div>
              <div className="source-card-grid">
                {link.event.sources.slice(0, 3).map((sourceLink: EventSourceLink) => (
                  <div className="source-card" key={sourceLink.id}>
                    <div className="list-card-topline">
                      <span>{sourceLink.rawNewsItem.source.name}</span>
                      <span>{formatMarketDate(sourceLink.rawNewsItem.publishedAt ?? report.marketDate)}</span>
                    </div>
                    <h4>{sourceLink.rawNewsItem.title}</h4>
                    <p>{sourceLink.rawNewsItem.summary ?? "No source summary available."}</p>
                    <a
                      className="inline-link"
                      href={sourceLink.rawNewsItem.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source
                    </a>
                  </div>
                ))}
              </div>
              <Link className="inline-link" href={`/news/${link.event.slug}`}>
                Open evidence detail
              </Link>
            </article>
          ))}
        </div>
      </section>

      {report.stockFocuses.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Stocks</p>
            <h2>Focused tickers mentioned in the brief.</h2>
          </div>
          <div className="card-grid">
            {report.stockFocuses.map((focus: StockFocus) => (
              <article className="card stock-focus-card" key={focus.id}>
                <p className="eyebrow">Ticker</p>
                <h2>{focus.symbol}</h2>
                {focus.company ? <p className="stock-focus-company">{focus.company}</p> : null}
                <p>{focus.thesis}</p>
                <Link className="inline-link" href={`/stocks/${focus.symbol}`}>
                  Open stock context
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
