# Deployment Checklist

## Free Stack

- App: Vercel Hobby
- Database: Supabase Free Postgres
- Scheduler: GitHub Actions

## 1. Supabase

1. Create a new Supabase project.
2. Open the database settings and copy:
   - pooled connection string for `DATABASE_URL`
   - direct connection string for `DIRECT_URL`
3. Keep the password handy for Vercel env setup.

## 2. Vercel

1. Import the GitHub repository into Vercel.
2. Set project environment variables:

```env
DATABASE_URL=
DIRECT_URL=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
CRON_SECRET=
RSS_ALLOW_INSECURE_TLS=false
OLLAMA_TIMEOUT_MS=120000
OLLAMA_KEEPALIVE=5m
OLLAMA_MAX_REPORT_EVENTS=3
OLLAMA_MAX_SOURCES_PER_EVENT=1
```

3. Deploy the app.

## 3. Production Database

Run once against production:

```bash
npx prisma migrate deploy
```

Optional baseline seed:

```bash
npm run db:seed
```

Then visit `/admin/login` and update:
- admin password
- AI provider rows
- active source list
- scheduled ET trigger time

## 4. GitHub Actions Scheduler

In the GitHub repository settings, add these Actions secrets:

```env
APP_CRON_URL=https://<your-vercel-domain>/api/cron/daily-report
CRON_SECRET=<same-as-vercel>
```

The workflow:
- runs every 5 minutes
- calls the protected cron route
- lets the app decide whether the configured ET schedule window has been reached

## 5. Production Validation

1. Open `/admin/login`
2. Confirm the active AI profile is correct
3. Confirm at least one news source is active
4. Confirm the schedule shown in `Automation`
5. Trigger `Run now`
6. Verify a `JobRun` row appears
7. Verify a published report appears on the public homepage
