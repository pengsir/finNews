import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed script.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

const marketDate = new Date("2026-03-12T13:00:00.000Z");

const sourceSeeds = [
  {
    slug: "wsj-markets",
    name: "WSJ Markets",
    feedUrl: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    sourceType: "rss",
    weight: 1.3
  },
  {
    slug: "cnbc-markets",
    name: "CNBC Markets",
    feedUrl: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    sourceType: "rss",
    weight: 1.15
  },
  {
    slug: "marketwatch-top-stories",
    name: "MarketWatch Top Stories",
    feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    sourceType: "rss",
    weight: 1.05
  }
];

const rawItemSeeds = [
  {
    slug: "fed-rate-path",
    sourceSlug: "wsj-markets",
    externalId: "fed-rate-path-001",
    title: "Treasury yields ease as traders watch the Fed rate path",
    url: "https://example.com/wsj/fed-rate-path",
    language: "en",
    publishedAt: new Date("2026-03-12T10:45:00.000Z"),
    summary: "Bond yields ease while traders reposition ahead of key inflation data."
  },
  {
    slug: "ai-chip-demand",
    sourceSlug: "cnbc-markets",
    externalId: "ai-chip-demand-001",
    title: "Chip stocks rally as hyperscaler AI spending stays firm",
    url: "https://example.com/cnbc/ai-chip-demand",
    language: "en",
    publishedAt: new Date("2026-03-12T11:10:00.000Z"),
    summary: "Semiconductor names climb after fresh signs of sustained AI infrastructure demand."
  },
  {
    slug: "energy-oil-volatility",
    sourceSlug: "marketwatch-top-stories",
    externalId: "energy-oil-volatility-001",
    title: "Oil swings keep energy shares in focus before the opening bell",
    url: "https://example.com/marketwatch/energy-oil-volatility",
    language: "en",
    publishedAt: new Date("2026-03-12T11:40:00.000Z"),
    summary: "Crude volatility keeps energy leadership under scrutiny heading into the session."
  }
];

const eventSeeds = [
  {
    slug: "fed-rate-path",
    title: "Fed path expectations cool Treasury yields",
    summary: "Rates-sensitive assets stabilize as yields ease and traders reassess the path of Fed cuts.",
    sentiment: "neutral",
    importanceScore: 8.8,
    sectors: ["Macro", "Financials", "Growth"],
    tickers: ["SPY", "QQQ", "TLT"],
    rawItemSlugs: ["fed-rate-path"]
  },
  {
    slug: "ai-chip-demand",
    title: "AI infrastructure demand extends semiconductor momentum",
    summary: "Semiconductor leaders remain supported by enterprise and hyperscaler AI capex expectations.",
    sentiment: "bullish",
    importanceScore: 9.2,
    sectors: ["Technology", "Semiconductors"],
    tickers: ["NVDA", "AMD", "SMH"],
    rawItemSlugs: ["ai-chip-demand"]
  },
  {
    slug: "energy-oil-volatility",
    title: "Oil volatility keeps energy leadership in play",
    summary: "Commodity swings raise both upside potential and event risk for energy names into the open.",
    sentiment: "mixed",
    importanceScore: 7.9,
    sectors: ["Energy"],
    tickers: ["XLE", "CVX", "XOM"],
    rawItemSlugs: ["energy-oil-volatility"]
  }
];

async function resetDatabase() {
  await prisma.$transaction([
    prisma.adminUser.deleteMany(),
    prisma.automationSetting.deleteMany(),
    prisma.reportPageView.deleteMany(),
    prisma.reportFeedback.deleteMany(),
    prisma.manualEditLog.deleteMany(),
    prisma.stockFocus.deleteMany(),
    prisma.dailyReportEvent.deleteMany(),
    prisma.dailyReport.deleteMany(),
    prisma.newsEventSource.deleteMany(),
    prisma.newsEvent.deleteMany(),
    prisma.rawNewsItem.deleteMany(),
    prisma.aiProviderConfig.deleteMany(),
    prisma.jobRun.deleteMany(),
    prisma.newsSource.deleteMany()
  ]);
}

async function seedSources() {
  const sources = new Map();

  for (const source of sourceSeeds) {
    const created = await prisma.newsSource.create({ data: source });
    sources.set(source.slug, created);
  }

  return sources;
}

async function seedRawItems(sourceMap) {
  const rawItems = new Map();

  for (const rawItem of rawItemSeeds) {
    const created = await prisma.rawNewsItem.create({
      data: {
        sourceId: sourceMap.get(rawItem.sourceSlug).id,
        externalId: rawItem.externalId,
        title: rawItem.title,
        url: rawItem.url,
        language: rawItem.language,
        publishedAt: rawItem.publishedAt,
        summary: rawItem.summary,
        content: rawItem.summary
      }
    });

    rawItems.set(rawItem.slug, created);
  }

  return rawItems;
}

async function seedEvents(rawItemMap) {
  const events = [];

  for (const event of eventSeeds) {
    const created = await prisma.newsEvent.create({
      data: {
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        sentiment: event.sentiment,
        importanceScore: event.importanceScore,
        sectors: event.sectors,
        tickers: event.tickers,
        marketDate,
        sources: {
          create: event.rawItemSlugs.map((rawItemSlug) => ({
            rawNewsItemId: rawItemMap.get(rawItemSlug).id
          }))
        }
      }
    });

    events.push(created);
  }

  return events;
}

async function seedReport(events) {
  const report = await prisma.dailyReport.create({
    data: {
      slug: "2026-03-12-pre-market-brief",
      marketDate,
      title: "March 12 Pre-Market Brief | 3 Key Themes Before the Bell",
      summary: "Rates, AI semiconductors, and energy volatility lead the opening setup.",
      contentZhEn:
        "EN: Treasury yields eased, AI chip leaders stayed firm, and energy remained headline-driven before the U.S. open.\n\nZH: 美股开盘前，市场主线集中在利率预期回落、AI 芯片需求韧性，以及能源板块受油价波动驱动的机会与风险。",
      sentimentSummary:
        "The tape looks constructive for growth, but leadership is still narrow and sensitive to macro data.",
      sectorView:
        "Technology remains strongest, energy is tactical, and financials depend on the rates backdrop.",
      tradingView:
        "Favor market and sector-level positioning while avoiding overconfidence ahead of fresh macro catalysts.",
      riskWarning:
        "Headline risk around inflation, rates, and commodities can reverse early moves quickly.",
      disclaimer:
        "This report is for informational purposes only and is not investment advice.",
      status: "PUBLISHED",
      publishedAt: marketDate,
      events: {
        create: events.map((event, index) => ({
          eventId: event.id,
          sortOrder: index + 1
        }))
      },
      stockFocuses: {
        create: [
          {
            symbol: "NVDA",
            company: "NVIDIA",
            thesis:
              "AI infrastructure demand remains the cleanest growth narrative in the mock dataset."
          },
          {
            symbol: "XOM",
            company: "Exxon Mobil",
            thesis:
              "Energy exposure benefits from commodity strength but carries higher intraday event risk."
          }
        ]
      }
    }
  });

  await prisma.manualEditLog.create({
    data: {
      reportId: report.id,
      editorLabel: "system-seed",
      note: "Initial mock bilingual report inserted for UI development."
    }
  });
}

async function seedAiConfig() {
  await prisma.aiProviderConfig.createMany({
    data: [
      {
        label: "Gemini Flash",
        provider: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        apiKey: "",
        model: "gemini-2.5-flash",
        isActive: true
      },
      {
        label: "Local Ollama",
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        apiKey: null,
        model: "qwen2.5:7b",
        isActive: false
      },
      {
        label: "Mock Generator",
        provider: "mock",
        baseUrl: "http://localhost/mock",
        apiKey: null,
        model: "mock",
        isActive: false
      }
    ]
  });
}

async function seedAdminUser() {
  await prisma.adminUser.create({
    data: {
      username: process.env.ADMIN_USERNAME || "admin",
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "finnews-admin")
    }
  });
}

async function seedAutomationSettings() {
  await prisma.automationSetting.create({
    data: {
      jobType: "daily-report",
      scheduleHourEt: 9,
      scheduleMinuteEt: 0,
      lastScheduledDateEt: null
    }
  });
}

async function main() {
  await resetDatabase();
  const sourceMap = await seedSources();
  const rawItemMap = await seedRawItems(sourceMap);
  const events = await seedEvents(rawItemMap);
  await seedReport(events);
  await seedAiConfig();
  await seedAdminUser();
  await seedAutomationSettings();

  console.log("Seed complete: 3 sources, 3 raw items, 3 events, 1 daily report, 1 admin user.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
