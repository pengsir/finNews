import Link from "next/link";
import { formatMarketDate } from "@/lib/format";
import {
  searchPublicContent,
  type SearchScope,
  type SearchSort
} from "@/server/queries/public-content";

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "reports", label: "Reports" },
  { value: "events", label: "Events" },
  { value: "stocks", label: "Stocks" }
];

const sortOptions: Array<{ value: SearchSort; label: string }> = [
  { value: "relevance", label: "Best match" },
  { value: "latest", label: "Latest first" }
];

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    scope?: string;
    sort?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", scope, sort } = await searchParams;
  const activeScope: SearchScope =
    scope === "reports" || scope === "events" || scope === "stocks" ? scope : "all";
  const activeSort: SearchSort = sort === "latest" ? "latest" : "relevance";
  const results = await searchPublicContent(q, {
    scope: activeScope,
    sort: activeSort
  });
  const hasQuery = q.trim().length > 0;
  const hasResults =
    results.reports.length > 0 || results.events.length > 0 || results.stocks.length > 0;

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Search</p>
        <h1>Search the market archive.</h1>
        <p className="lede">
          Search the live report archive by report content, event titles,
          sectors, and ticker symbols.
        </p>
        <form className="search-form" action="/search">
          <input
            aria-label="Search query"
            className="search-input"
            defaultValue={q}
            name="q"
            placeholder="Try DeepSeek, oil, NVDA, Adobe, rates..."
            type="search"
          />
          <input name="scope" type="hidden" value={activeScope} />
          <input name="sort" type="hidden" value={activeSort} />
          <button className="button-link" type="submit">
            Search
          </button>
        </form>
        <div className="filter-group">
          <div className="filter-row">
            {scopeOptions.map((option) => {
              const href =
                option.value === "all"
                  ? {
                      pathname: "/search",
                      query: {
                        q,
                        sort: activeSort
                      }
                    }
                  : {
                      pathname: "/search",
                      query: {
                        q,
                        scope: option.value,
                        sort: activeSort
                      }
                    };

              return (
                <Link
                  className={`filter-chip ${activeScope === option.value ? "filter-chip-active" : ""}`}
                  href={href}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <div className="filter-row">
            {sortOptions.map((option) => {
              const href =
                activeScope === "all"
                  ? {
                      pathname: "/search",
                      query: {
                        q,
                        sort: option.value
                      }
                    }
                  : {
                      pathname: "/search",
                      query: {
                        q,
                        scope: activeScope,
                        sort: option.value
                      }
                    };

              return (
                <Link
                  className={`filter-chip ${activeSort === option.value ? "filter-chip-active" : ""}`}
                  href={href}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {!hasQuery ? (
        <section className="section-block">
          <article className="feature-card">
            <p className="eyebrow">Search tips</p>
            <div className="prose-block">
              <p>Use a company name like `Adobe` or `Netflix`.</p>
              <p>Use a theme like `oil`, `DeepSeek`, `rates`, or `Middle East`.</p>
              <p>Use a symbol like `NVDA`, `SPY`, or `XOM`.</p>
              <p>Switch `Reports / Events / Stocks` when you want a tighter result set.</p>
            </div>
          </article>
        </section>
      ) : null}

      {hasQuery && !hasResults ? (
        <section className="section-block">
          <article className="feature-card">
            <p className="eyebrow">No results</p>
            <p>
              No matching reports, events, or stock notes were found for
              <strong> {q}</strong>.
            </p>
            <p className="muted-copy">Try another scope or change sorting back to best match.</p>
          </article>
        </section>
      ) : null}

      {results.reports.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Reports</p>
            <h2>Matching daily briefs.</h2>
          </div>
          <div className="stack-list">
            {results.reports.map((report) => (
              <article className="list-card" key={report.id}>
                <div className="list-card-topline">
                  <span>{formatMarketDate(report.marketDate)}</span>
                  <span>{report.events.length} events</span>
                  <span>{report.stockFocuses.length} stocks</span>
                </div>
                <h3>{report.title}</h3>
                <p>{report.summary}</p>
                <Link className="inline-link" href={`/reports/${report.slug}`}>
                  Open report
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {results.events.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Events</p>
            <h2>Matching market events.</h2>
          </div>
          <div className="stack-list">
            {results.events.map((event) => (
              <article className="list-card" key={event.id}>
                <div className="list-card-topline">
                  <span>{event.sentiment ?? "neutral"}</span>
                  <span>{event.sources.length} source items</span>
                  <span>{event.importanceScore.toFixed(1)} / 10</span>
                </div>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
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
                <Link className="inline-link" href={`/news/${event.slug}`}>
                  Open event
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {results.stocks.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Stocks</p>
            <h2>Matching stock focus notes.</h2>
          </div>
          <div className="card-grid">
            {results.stocks.map((stock) => (
              <article className="card" key={stock.id}>
                <h2>{stock.symbol}</h2>
                <p>{stock.thesis}</p>
                <p className="muted-copy">{formatMarketDate(stock.report.marketDate)}</p>
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
