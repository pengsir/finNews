-- Fin News production seed for Supabase SQL Editor
-- Purpose: create the minimum viable production records after schema bootstrap.
-- Includes:
--   1. admin user
--   2. daily-report automation setting
--   3. AI provider configs
--   4. live RSS news sources
--
-- Default admin login inserted by this script:
--   username: admin
--   password: finnews-admin
-- Change the password immediately from /admin after first login.

BEGIN;

-- Admin user
INSERT INTO "AdminUser" ("id", "username", "passwordHash", "createdAt", "updatedAt")
VALUES (
  'admin-user-seed',
  'admin',
  '2f6d4ab7f1e348d5b0a4a9d7be6c1f22:cd29c2755afe44e36370bd59d2d1fecdeba902a00d5b0ed26daa569254d348794a794c4ee7b60dc8e681167bac593252cb5fac4666154ce0ff19bde93f588660',
  NOW(),
  NOW()
)
ON CONFLICT ("username") DO UPDATE SET
  "updatedAt" = NOW();

-- Automation schedule: 9:00 AM ET
INSERT INTO "AutomationSetting" (
  "id",
  "jobType",
  "scheduleHourEt",
  "scheduleMinuteEt",
  "lastScheduledDateEt",
  "createdAt",
  "updatedAt"
)
VALUES (
  'automation-daily-report',
  'daily-report',
  9,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT ("jobType") DO UPDATE SET
  "scheduleHourEt" = EXCLUDED."scheduleHourEt",
  "scheduleMinuteEt" = EXCLUDED."scheduleMinuteEt",
  "updatedAt" = NOW();

-- AI provider configs
INSERT INTO "AiProviderConfig" (
  "id",
  "label",
  "provider",
  "baseUrl",
  "apiKey",
  "model",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'ai-gemini-flash',
    'Gemini Flash',
    'gemini',
    'https://generativelanguage.googleapis.com/v1beta',
    '',
    'gemini-2.5-flash',
    true,
    NOW(),
    NOW()
  ),
  (
    'ai-local-ollama',
    'Local Ollama',
    'ollama',
    'http://localhost:11434',
    NULL,
    'qwen2.5:7b',
    false,
    NOW(),
    NOW()
  ),
  (
    'ai-mock',
    'Mock Generator',
    'mock',
    'http://localhost/mock',
    NULL,
    'mock',
    false,
    NOW(),
    NOW()
  )
ON CONFLICT ("id") DO UPDATE SET
  "label" = EXCLUDED."label",
  "provider" = EXCLUDED."provider",
  "baseUrl" = EXCLUDED."baseUrl",
  "apiKey" = EXCLUDED."apiKey",
  "model" = EXCLUDED."model",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Ensure only one active AI profile remains active.
UPDATE "AiProviderConfig"
SET "isActive" = false,
    "updatedAt" = NOW()
WHERE "id" <> 'ai-gemini-flash';

UPDATE "AiProviderConfig"
SET "isActive" = true,
    "updatedAt" = NOW()
WHERE "id" = 'ai-gemini-flash';

-- Live RSS sources
INSERT INTO "NewsSource" (
  "id",
  "name",
  "slug",
  "feedUrl",
  "sourceType",
  "weight",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'source-wsj-markets',
    'WSJ Markets',
    'wsj-markets',
    'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    'rss',
    1.3,
    true,
    NOW(),
    NOW()
  ),
  (
    'source-cnbc-markets',
    'CNBC Markets',
    'cnbc-markets',
    'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    'rss',
    1.15,
    true,
    NOW(),
    NOW()
  ),
  (
    'source-marketwatch-top-stories',
    'MarketWatch Top Stories',
    'marketwatch-top-stories',
    'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    'rss',
    1.05,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "feedUrl" = EXCLUDED."feedUrl",
  "sourceType" = EXCLUDED."sourceType",
  "weight" = EXCLUDED."weight",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

COMMIT;
