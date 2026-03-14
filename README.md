# Fin News

Finance news analysis platform built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Current Status

- Planning converted into an implementation plan in `docs/implementation-plan.md`
- Initial application scaffold created
- Prisma schema, initial migration, and mock seed script added
- Daily job entry point added
- Admin access, AI profile switching, source CRUD, and basic analytics are available locally
- The daily pipeline now reads the active AI profile from the database, so production model credentials no longer depend on environment variables
- The daily pipeline can ingest live RSS, send the ranked event set to the active AI profile, and persist a published report locally
- Admin can change the scheduled ET trigger time, and production scheduling now reads that value from the database

## Local Setup

1. Copy `.env.example` to `.env.dev` and point it at a PostgreSQL database
2. Run `npx prisma migrate deploy` or `npm run db:migrate`
3. Run `npm run db:seed`
4. Run `npm run pipeline:daily` to generate a local published report with the currently active database-backed AI profile
5. Visit `/admin/login`, sign in, and manage AI profiles, source feeds, and report analytics from the admin desk

## Recommended Free Production Stack

- App hosting: Vercel Hobby
- Database: Supabase Free PostgreSQL
- Scheduler and long-running pipeline execution: GitHub Actions on a public repository
- AI: Gemini free tier or local Ollama for debugging

This stack matches the current app shape well:
- Vercel handles the Next.js app and public site
- Supabase provides managed Postgres for Prisma
- GitHub Actions runs the pipeline itself every hour and records job state in the shared production database

## AI Provider Notes

- AI provider settings live in the `AiProviderConfig` table and are managed from `/admin`.
- The active database row is the only source of truth for production report generation.
- Recommended cloud profile: Gemini `gemini-2.5-flash`. Higher-quality option: `gemini-2.5-pro`.
- Local Ollama profiles still work; optional tuning env vars remain:
- Local scripts in `package.json` now load `.env.dev` explicitly for dev/build/pipeline/Prisma commands.
  - `OLLAMA_TIMEOUT_MS`
  - `OLLAMA_KEEPALIVE`
  - `OLLAMA_MAX_REPORT_EVENTS`
  - `OLLAMA_MAX_SOURCES_PER_EVENT`

## Production Deployment

### 1. Push to GitHub

1. Create a new public GitHub repository.
2. Add the remote locally:

```bash
git remote add origin <your-github-repo-url>
```

3. Push the repo:

```bash
git add .
git commit -m "Initial public release"
git push -u origin master
```

### 2. Provision Free PostgreSQL

1. Create a free Supabase project.
2. Copy the project Postgres connection string.
3. Set these env vars in Vercel:

```env
DATABASE_URL=
DIRECT_URL=
CRON_SECRET=
ADMIN_SESSION_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=
```

Do not set production AI provider env vars. Production report generation reads the active provider row from the `AiProviderConfig` table instead.
If your Supabase URLs use `sslmode=require`, the app automatically adds `uselibpqcompat=true` for Prisma/pg compatibility.

### 3. Deploy the App

1. Import the GitHub repository into Vercel.
2. Set the environment variables above.
3. Deploy.
4. Run Prisma migration against production:

```bash
npx prisma migrate deploy
```

5. Seed the production database once if you want baseline admin credentials and sample configuration:

```bash
npm run db:seed
```

### 4. Configure GitHub Actions Runner

The repository includes a GitHub Actions workflow at `.github/workflows/pipeline-runner.yml`.

Add these GitHub Actions secrets:

```env
DATABASE_URL=<same pooled connection string used in Vercel>
DIRECT_URL=<same direct connection string used in Vercel>
```

If your secret values already include `sslmode=require`, you do not need to rewrite them manually; the runtime adds the compatibility flag automatically.

Then:
- GitHub Actions will wake up every hour
- The workflow will check the ET schedule stored in `AutomationSetting`
- When the time window is reached, the workflow will run the full daily pipeline directly on the GitHub runner
- You can change the schedule later from `/admin?tab=automation`

### 5. Configure Admin Manual Trigger

The admin `Run now` button dispatches the GitHub Actions workflow instead of running a long task inside Vercel.

Add these Vercel environment variables:

```env
GITHUB_ACTIONS_TOKEN=
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
GITHUB_PIPELINE_WORKFLOW_ID=pipeline-runner.yml
GITHUB_REPO_REF=master
```

The GitHub token should have permission to dispatch workflows for this repository.

## CI

- `.github/workflows/ci.yml` runs on push and pull request
- It validates dependency install, Prisma client generation, type-check, and production build
- The scheduler workflow is separate and only triggers the cron endpoint

## Automation

- Manual trigger: `/admin` -> `Automation` tab -> `Run daily pipeline now`
- Manual trigger implementation: dispatches the GitHub Actions pipeline workflow
- Scheduled trigger implementation: GitHub Actions every hour running `scripts/run-scheduled-pipeline.ts`
- Runtime schedule source of truth: `AutomationSetting` in the database, editable from `/admin?tab=automation`
