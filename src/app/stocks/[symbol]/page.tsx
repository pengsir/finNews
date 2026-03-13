import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMarketDate, toTitleSymbol } from "@/lib/format";
import { getStockPageData } from "@/server/queries/public-content";

interface StockPageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const normalizedSymbol = toTitleSymbol(symbol);
  const stockEntries = await getStockPageData(normalizedSymbol);

  if (stockEntries.length === 0) {
    notFound();
  }

  const latestEntry = stockEntries[0];
  type ReportEventLink = (typeof latestEntry.report.events)[number];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Stock Focus</p>
        <h1>{normalizedSymbol}</h1>
        <p className="lede">{latestEntry.thesis}</p>
        <div className="hero-meta">
          <span>{latestEntry.company ?? "Company name not set"}</span>
          <span>{stockEntries.length} linked report entries</span>
          <span>{formatMarketDate(latestEntry.report.marketDate)}</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Report history</p>
          <h2>Where this symbol appears in the seeded market brief archive.</h2>
        </div>
        <div className="stack-list">
          {stockEntries.map((entry) => (
            <article className="list-card" key={entry.id}>
              <div className="list-card-topline">
                <span>{formatMarketDate(entry.report.marketDate)}</span>
                <span>{entry.report.events.length} report events</span>
              </div>
              <h3>{entry.report.title}</h3>
              <p>{entry.thesis}</p>
              <Link className="inline-link" href={`/reports/${entry.report.slug}`}>
                Open linked report
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Context</p>
          <h2>Related events from the latest linked report.</h2>
        </div>
        <div className="card-grid">
          {latestEntry.report.events.map((link: ReportEventLink) => (
            <article className="card" key={link.event.id}>
              <h2>{link.event.title}</h2>
              <p>{link.event.summary}</p>
              <Link className="inline-link" href={`/news/${link.event.slug}`}>
                View event evidence
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
