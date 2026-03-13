# Implementation Plan

## Goals

- Launch a bilingual finance analysis site with a public web experience and an internal admin backend.
- Automate the daily workflow: ingest news, deduplicate events, rank the top stories, generate AI analysis, review if needed, and publish before 9:00 AM U.S. Eastern Time.
- Preserve source traceability for every generated insight.

## Architecture

- Framework: Next.js App Router with TypeScript.
- Hosting: Vercel for web delivery.
- Database: Supabase PostgreSQL.
- ORM: Prisma.
- Auth: none in v1 for public users; admin auth added later.
- Scheduling: Supabase Cron calls a protected route handler.
- AI layer: provider abstraction with runtime-configurable provider, base URL, model, and API key.

## Application Areas

### Public Routes

- `/`: latest daily report landing page.
- `/reports/[slug]`: full report page.
- `/news/[id]`: source-group detail page for a news event.
- `/stocks/[symbol]`: stock analysis page seeded by daily report context.
- `/archive`: 30-day report archive.
- `/search`: keyword and ticker search.

### Admin Routes

- `/admin`: dashboard overview.
- `/admin/reports`: draft and published reports.
- `/admin/news-sources`: source configuration.
- `/admin/jobs`: task run logs and rerun actions.
- `/admin/settings/ai`: AI provider configuration.

## Data Model

### Core Content

- `NewsSource`: source registry with weight, feed URL, and active flag.
- `RawNewsItem`: normalized item fetched from feeds/APIs before deduplication.
- `NewsEvent`: merged event with summary, importance score, sectors, tickers, and linked source items.
- `DailyReport`: generated report for a market date with publication status and bilingual content.
- `DailyReportEvent`: join table linking the selected events included in a report.
- `StockFocus`: stock-level analysis entities linked to report context.

### Operations

- `AiProviderConfig`: active provider and model metadata.
- `JobRun`: fetch, dedupe, generate, and publish job logs with retry metadata.
- `ManualEditLog`: optional audit trail for admin edits after generation.

## Daily Pipeline

1. Fetch finance news from configured sources.
2. Normalize stories into `RawNewsItem`.
3. Cluster duplicates into `NewsEvent` while preserving all source links.
4. Rank events using source weights, cross-source repetition, and AI significance scoring.
5. Select up to 20 top events, allowing fewer when source quality is lower.
6. Generate bilingual report sections plus stock and sector highlights.
7. Save report draft with evidence references.
8. Auto-publish or allow admin review depending on environment.

## AI Service Design

- `AiClient` interface with `generateReport` and `scoreEvents`.
- Provider adapters live under `src/server/ai/providers`.
- Prompt builders accept structured event payloads, not free-form strings.
- Output schemas are validated before persisting.

## Search Design

- Prisma-backed search in v1 across report title/body, event title, tickers, and sectors.
- Keep schema and query boundaries ready for full-text search later.

## Delivery Phases

### Phase 1

- Project scaffold.
- Prisma schema and local migrations.
- Public report pages with mocked data.
- Cron endpoint and job orchestration shells.

### Phase 2

- Source ingestion adapters.
- Deduplication and ranking pipeline.
- AI provider abstraction and report generation.

### Phase 3

- Admin screens.
- Publishing controls.
- Search and archive polish.
- Monitoring and failure notifications.

## Open Decisions

- Admin authentication approach after v1 bootstrap.
- Notification channel for failed scheduled jobs.
- Exact source ingestion mix: RSS, direct APIs, or hybrid.
