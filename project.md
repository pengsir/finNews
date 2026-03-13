# Project Context

## Project Overview

- Product type: public website with admin backend and mobile-friendly responsive experience.
- Core goal: before the U.S. stock market opens each trading day, automatically collect the top 20 finance news items, analyze them with AI, and publish a daily market post with actionable insights.
- Primary value: turn fragmented finance news into structured, traceable, bilingual market analysis for public readers.
- Current priority: validate product value first, not monetization.

## Phase 1: Planning

### Goal

Build a public-facing AI finance analysis platform that publishes a daily pre-market report.

### Scope

- Public website
- Admin backend
- Mobile responsive web experience
- Automated news collection
- Automated AI analysis
- Automated publishing

### Positioning

- Prefer positioning as AI market analysis and information interpretation, not licensed investment advisory.
- Include risk warning and disclaimer in every report.

### Publishing Window

- Daily automatic publication target: 9:00 AM U.S. Eastern Time.

## Phase 2: Requirements Definition

### Content Requirements

- Languages: Chinese and English in a single mixed bilingual article.
- Article sections:
  - news summary
  - market sentiment
  - key sectors
  - key stocks
  - trading suggestions
  - risk warning
  - disclaimer
- AI evidence must be preserved and traceable to cited news.

### Product Requirements

- No user login in v1, but keep extension points for future auth.
- Frontend pages:
  - daily report page
  - news reference/detail
  - stock analysis page
  - 30-day history archive
  - search
- Admin capabilities:
  - configure AI API key and provider settings
  - manage news sources
  - rerun jobs manually
  - edit AI-generated articles
  - publish/unpublish
  - basic reading-time statistics
  - task log page

### Functional Constraints

- v1 trading suggestions focus on market and sector level.
- Keep extension points for future stock-level and finer trading actions.
- If fewer than 20 quality news items are available, still generate and publish the report.
- Manual override versioning is not required in v1.

## Phase 3: Technical Design Decisions

### Core Stack

- Monorepo/app structure: single `Next.js` project
- Language: `TypeScript`
- Database: `Supabase PostgreSQL`
- ORM: `Prisma`
- Deployment: `Vercel`
- Source control: `GitHub`
- CI: `GitHub Actions`
- Scheduler: `GitHub Actions` calling the protected cron endpoint

### AI Strategy

- Use cloud-based free or low-cost AI APIs first.
- Do not bind the app to a single provider.
- Build a provider-based abstraction layer with configurable:
  - provider
  - base URL
  - API key
  - model
- Manage AI settings with environment variables plus admin configuration.

### News Processing

- News ranking uses a combination of:
  - source importance weighting
  - repeated coverage / popularity signals
  - AI importance judgment
- Duplicate coverage should be merged into one event while preserving multiple source references.
- Stock analysis page should support both:
  - auto-generated stocks from the daily news set
  - admin-selected focus stocks

### Search

- v1 search should cover:
  - article title
  - article body
  - news title
  - ticker symbols
  - sector tags

## Phase 4: CI/CD Decisions

### Confirmed Choices

- GitHub repository: public
- CI checks required:
  - lint
  - type-check
  - test
  - build
- Testing strategy in v1:
  - focus on basic unit tests and critical-flow tests
- Deployment strategy:
  - push to main triggers production deployment
- Environments:
  - local
  - preview
  - production
- Environment variable strategy:
  - local `.env`
  - platform-managed environment variables

### Recommended Defaults

- Solo Git workflow: short-lived feature branches, merge to `main`, auto deploy on `main`
- Scheduled task failure handling: one automatic retry, then persist failure logs and send a lightweight notification

## Next Discussion Items

1. Choose a lightweight notification channel for failed scheduled jobs.
2. Implement source ingestion and news deduplication.
3. Connect Prisma to a live Supabase project and generate the first migration.

## Phase 5: Bootstrap Progress

### Completed

- Converted the planning output into an implementation document at `docs/implementation-plan.md`.
- Created an initial `Next.js` + `TypeScript` scaffold with App Router, base styling, and placeholder public/admin routes.
- Added a starter Prisma schema covering sources, raw news items, merged events, reports, stock focus, AI config, and job runs.
- Added a protected cron route and a daily pipeline shell for future automation work.
- Added environment variable templates and package scripts for local development.
- Installed project dependencies and verified that both `npm run type-check` and `npm run build` pass locally.
- Added an initial Prisma migration under `prisma/migrations/20260313000000_init`.
- Added a repeatable mock seed script that inserts sample sources, raw items, merged events, a published daily report, stock focus rows, and AI config.
- Installed local PostgreSQL 17 via Homebrew and started it as a background service.
- Created the local `fin_news` database, added a project `.env`, applied the initial migration, and successfully ran the mock seed.
- Wired the public homepage, archive page, report detail page, news event page, and stock page to live PostgreSQL-backed seed data.
- Added a shared public-content query layer plus formatting helpers for database-backed rendering.
- Implemented a local daily pipeline that ingests mock source coverage, ranks merged events, persists raw items/events, writes a draft report, and logs the job run.
- Added a local script entry point for the pipeline and verified it created a new draft report for `2026-03-13`.
- Added real RSS ingestion support with automatic fallback to mock coverage when a source fails.
- Replaced the blocked Reuters RSS source with a working WSJ Markets feed.
- Verified that WSJ, CNBC, and MarketWatch all ingest live RSS items locally in the current pipeline run, producing 30 raw items and 20 ranked events for `2026-03-13`.
- Added HTML entity decoding plus a first market-relevance filter so non-market personal-finance stories are less likely to pollute the daily event set.
- Added a first pass at title/token-based clustering to support cross-source event merging beyond exact key matches.
- Strengthened clustering with theme/concept fingerprints, which reduced the current live pipeline output from 20 ranked events to 14 and increased multi-source merged events to 6.
- Upgraded report generation so the AI input now includes the top ranked events plus source titles, summaries, URLs, and timestamps instead of only event-level headlines.
- Verified that the generated draft blog now includes event-by-event narrative sections and an explicit evidence trail derived from the selected top news items.
- Improved the public report page so the generated blog narrative, AI evidence trail, and per-event source cards are rendered as distinct reading sections instead of one long block.
- Implemented database-backed public search across reports, events, sectors, and stock focus notes.
- Verified representative searches like `DeepSeek`, `oil`, and `NVDA` return sensible grouped matches from the live dataset.
- Refactored AI integration into a clearer provider registry with separate `mock`, `ollama`, and `openai-compatible` client paths.
- Switched the local Ollama provider to use the `ollama` CLI over `stdin` instead of long command-line prompt arguments, which proved more reliable on this machine.
- Added report-output normalization so provider responses with slightly non-conforming JSON shapes can still be coerced into the Prisma-backed report schema.
- Verified an end-to-end Ollama-backed pipeline run on March 13, 2026 succeeded locally with 24 raw items, 12 ranked events, and all three RSS sources live.
- Extended the public report page so normalized AI fields like `sectorView`, `tradingView`, `riskWarning`, `disclaimer`, and `stockFocuses` render as structured reading blocks instead of raw single-string blobs.
- Added lightweight archive/search controls so the public UI now supports archive sorting (`recent`, `events`, `stocks`) plus search scope and sort toggles without introducing a separate search index.
- Refreshed the public UI into a more editorial finance-site layout with a persistent left sidebar, publication-style framing, and navigation by date and category.
- Turned the new sidebar entry points into real landing pages by adding dedicated edition (`/editions/[date]`) and topic (`/topics/[slug]`) routes backed by Prisma queries instead of generic search redirects.
- Enriched the new edition/topic landing pages with editorial-style summary modules such as lead sectors, lead tickers, coverage stats, and recent-edition cross-links so they feel like browsable desks rather than raw result lists.
- Increased the local Ollama daily-report prompt and context window so regenerated daily blogs are materially longer, with the latest `contentZhEn` landing around 670 characters instead of a very short brief.
- Added a dedicated Gemini cloud provider so the AI layer can now switch between local Ollama, mock mode, OpenAI-compatible endpoints, and Google Gemini without changing the pipeline shape.
- Switched local development commands over to `.env.dev` via a dedicated wrapper script so `next`, `prisma`, and pipeline tasks all read the same dev environment without relying on unsupported `NODE_OPTIONS` tricks.
- Changed the daily pipeline so AI-generated reports are now published immediately instead of being saved as drafts, which makes them appear in public navigation as soon as generation succeeds.
- Added per-report like/unlike feedback on AI-generated report pages, including a small dialog that collects a reason when the user clicks unlike, backed by a new `ReportFeedback` table and API route.
- Hardened the report feedback API so server-side failures now return structured JSON and log a clear error message instead of surfacing only a generic frontend failure string.
- Implemented a real admin module with credential-gated access, AI profile management, news-source CRUD, and analytics panels for report views plus reader feedback.
- Added database-backed runtime AI switching so the daily pipeline now prefers the active `AiProviderConfig` row over static environment defaults.
- Added report page-view tracking via a new `ReportPageView` model and lightweight client-side tracking on report detail pages.
- Refined the admin desk into compact URL-driven tabs (`Overview`, `Automation`, `AI Models`, `Sources`, `Analytics`) and added a manual `Run daily pipeline now` control.
- Moved production AI generation to a database-only source of truth: the daily pipeline now requires an active `AiProviderConfig` row and no longer falls back to env-level provider selection.
- Added a production cron definition in `vercel.json` for the daily report endpoint and documented the `9:00 AM ET` scheduling caveat for UTC-only schedulers.
- Upgraded `JobRun` into a fuller execution log with trigger source, AI provider/model, report slug, token counters, started/finished timestamps, and status-ready metadata for the admin automation view.
- Moved admin password storage into the database via a new `AdminUser` table and scrypt-hashed passwords, and added an admin `Security` tab for password updates.
- Added token-usage fallback estimation for providers that do not expose native usage metadata, while preserving real Gemini usage when available.
- Corrected the local active AI profile to a database-backed Gemini configuration, and verified a successful run now records prompt/completion/total token counts in `JobRun`.
- Tightened the admin `Automation`, `AI Models`, and `Sources` tabs into denser list-style layouts so multiple records can be scanned and edited in one viewport.
- Continued the admin redesign toward a real operations table: added sticky headers, column-oriented compact rows, and URL-driven filters for job status/provider and source status/type.
- Tightened the public shell and homepage framing by reducing oversized card spacing and clamping long hero/sidebar titles so large generated headlines no longer dominate the layout.
- Reduced remaining oversized admin cards by converting `Overview` and `Analytics` into compact summary/detail tables, and added reusable single-line clamp handling for long titles, models, URLs, and feedback text.
- Added a database-backed `Local Ollama` AI profile for admin-side runtime switching, standardized it on `qwen2.5:7b`, and updated the Ollama provider to call the local HTTP service at the configured `baseUrl` instead of relying on the local CLI process.
- Simplified the admin `AI Models` table by removing the visible `label` column, deriving labels server-side from provider/model when needed, and refocusing the UI on provider, model, endpoint, auth, status, and actions.
- Refined the admin `AI Models` interaction model again: removed the dedicated status column, added row highlighting for the active config, switched state control to `Activate / Deactivate` actions, and changed AI profile ordering to a stable creation order so rows do not jump when the active profile changes.
- Confirmed the admin `Automation` tab manual trigger was reaching the backend and creating `ADMIN` `JobRun` rows, then added explicit success/error redirects and inline feedback so `Run now` no longer looks inert after a click.
- Hardened the admin `Automation` trigger by blocking duplicate manual runs while a `RUNNING` job exists, surfacing the in-progress state directly in the UI, and standardizing clickable controls with pointer cursors plus disabled `not-allowed` feedback.
- Changed the admin manual pipeline flow to start in the background after pre-creating a `RUNNING` `JobRun`, added an authenticated job-status polling route so the `Automation` tab auto-refreshes when the run finishes, and locked `AI Models` plus `Sources` edits while a pipeline run is in progress.
- Added a database-backed `AutomationSetting` for the daily report schedule, exposed the ET hour/minute in the admin `Automation` tab, and changed the deployment cron strategy to poll `/api/cron/daily-report` every 5 minutes while the route itself decides whether the configured ET trigger window has been reached.
- After adding the new Prisma `AutomationSetting` model, local `next dev` needed a full restart to pick up the regenerated Prisma client; otherwise `/admin` could throw a stale-runtime `automationSetting.findUnique` error even though type-check and build were already green.
- Reworked the production deployment plan around free-tier constraints: removed the Vercel cron dependency, added a GitHub Actions scheduler workflow that hits the protected cron route every 5 minutes, updated the README deployment instructions, and tightened `.gitignore` so `.env.dev` will not leak when the repository is published.
- Added a separate GitHub Actions CI workflow for push/PR validation plus a deployment checklist document, so the newly pushed public repository is ready for cloud setup and ongoing free-tier scheduling without relying on local machine state.
- Fixed a cloud-only TypeScript issue on `/admin` by explicitly typing the dashboard array callback parameters in `src/app/admin/page.tsx`, which prevented Vercel from failing on an implicit-`any` build error even though the local environment had previously been more permissive.

### Decisions Made

- Use App Router route groups later if admin/public layouts need to diverge, but keep the first scaffold simple.
- Keep AI integration behind a provider interface from day one so OpenAI-compatible endpoints and other vendors can share the same pipeline.
- Start with mocked page content and pipeline shells before wiring external services, to keep the repository bootstrappable without credentials.
- Keep the first migration checked into git even though Prisma CLI validation is currently blocked by a local certificate issue while downloading the schema engine.
- Make the seed script reset-and-reseed the content tables so UI development can return to a known state quickly.
- Because the project is using Prisma 7, move datasource URLs into `prisma.config.ts` and use the PostgreSQL driver adapter for runtime Prisma clients and seed scripts.
- Keep the first public UI iteration server-rendered and query directly through Prisma so the archive/report/evidence flows can be validated before adding caching or search indexing.
- Keep the first ingestion pipeline source-driven but mock-backed, so the persistence flow, event modeling, and report generation can be tested before wiring live RSS/API fetchers.
- Record per-source ingestion status in the pipeline result so live vs fallback behavior is visible in logs while source quality is still being tuned.
- Treat the database `AiProviderConfig` row as the real runtime contract for Ollama as well, so local debugging can switch providers in admin without changing server environment variables or requiring a shell-level `ollama` command path.
- Use GitHub Actions as the production scheduler for the public repo, because it supports 5-minute schedules on public repositories while Vercel Hobby cron is too limited for the app's database-driven ET schedule window.
- Try normal RSS fetch first, then retry with insecure TLS only for local certificate failures, since different providers behave differently under the current machine setup.
- Filter RSS stories for market relevance before ranking so archive/report content stays closer to the pre-market use case.
- Use lightweight concept fingerprints as an intermediate clustering step before any heavier embedding or LLM-assisted deduplication work.
- Treat the top ranked event set as the canonical AI input for the daily blog so the generated draft stays grounded in the selected evidence chain.
- Keep the report page optimized for evidence readability: narrative first, explicit AI evidence trail second, source cards third.
- Keep the first public search server-rendered and query directly through Prisma before introducing full-text indexing.
- Normalize provider output before persistence so local LLM drift does not break the report schema or downstream pages.
- Prefer `ollama` CLI stdin prompting for local generation because the HTTP endpoint and long CLI prompt arguments were less reliable in this environment.
- Keep the report page aligned with normalized AI fields so provider swaps do not require additional UI-specific parsing work.
- Keep archive/search improvements URL-driven and server-rendered first, so navigation remains simple while the dataset is still small.
- Treat the public experience like a finance publication, not a bare app shell: global navigation, recent editions, and topic entry points should be visible from every page.
- Use dedicated landing pages for recurring editorial axes like date and topic so the site feels browsable even before heavier taxonomy or search infrastructure exists.
- Prefer lightweight computed editorial metadata in the UI layer first, using the existing Prisma graph, before introducing a separate aggregation/indexing system.
- Tune local Ollama generation with prompt constraints and event/source limits in `.env` first when article depth needs to change, rather than immediately changing database or page structure.
- Prefer Gemini `gemini-2.5-flash` as the first free cloud default when moving off local models, with `gemini-2.5-pro` as the higher-quality option once latency/cost tradeoffs are acceptable.
- Use a wrapper script for `.env.dev` loading instead of `node -r dotenv/config` around `next build`, because Next worker processes reject that `NODE_OPTIONS` pattern.
- Treat successful generated reports as public by default in the current product flow, since the site navigation and browse experience depend on newly generated editions being visible immediately.
- Treat report-quality feedback as first-class product input even before full user accounts exist, so anonymous readers can still help tune AI output quality.
- Restart the local dev server after Prisma schema/client changes that add new delegates, because stale Next server processes can keep an older Prisma client in memory and break new API routes.
- Use simple cookie-backed admin auth with env-configurable username/password for the local admin module before introducing a fuller auth provider.
- Keep admin operations server-rendered and server-action-based first, so AI switching and source CRUD work without a separate frontend state layer.
- Treat the active AI profile in the database as the only authoritative production generation config; environment variables are now just local operational helpers for auth, DB, cron secret, and optional Ollama tuning.
- Use the database-backed admin user as the long-lived credential source; env-based admin username/password now only serve as bootstrap defaults when no admin user exists yet.

### Open Questions

- Which notification channel should be used for failed scheduled jobs: email, Slack, Telegram, or another lightweight option?
- Should admin authentication in v1 use Supabase Auth or Vercel-protected middleware first?
- Which initial finance sources should be included in the first ingestion batch?
- How should the local Prisma certificate/download issue be resolved so Prisma commands no longer need a temporary TLS bypass on this machine?
- Should the next ingestion upgrade prioritize more live RSS sources first, or move directly to premium/API connectors for better finance coverage quality?
- How far should provider normalization go before adding stricter JSON schema enforcement or repair/retry logic for model output?

### Immediate Next Steps

1. Run dependency installation and verify the app boots locally.
2. Create the first Prisma migration and seed data for mock reports and events.
3. Implement source adapters and the ranking/deduplication pipeline.

### Updated Immediate Next Steps

1. Add a real Gemini API key locally and run the daily pipeline through the new cloud provider to compare report quality against the current Ollama flow.
2. Refine clustering further for edge cases like broad commodity/rates themes that may still over-merge or under-merge across providers.
3. Resolve the Prisma certificate issue so local CLI commands can run without the temporary TLS workaround.
