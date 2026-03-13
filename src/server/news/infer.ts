const sectorRules = [
  { label: "Technology", keywords: ["ai", "chip", "semiconductor", "software", "cloud"] },
  { label: "Semiconductors", keywords: ["chip", "semiconductor", "gpu", "foundry"] },
  { label: "Energy", keywords: ["oil", "crude", "energy", "opec", "gas"] },
  { label: "Financials", keywords: ["bank", "credit", "treasury", "yield", "fed", "rates"] },
  { label: "Banks", keywords: ["bank", "lender", "loan"] },
  { label: "Macro", keywords: ["fed", "inflation", "rates", "yield", "economy", "payroll"] },
  { label: "Consumer", keywords: ["retail", "consumer", "e-commerce"] },
  { label: "Healthcare", keywords: ["health", "biotech", "drug"] }
];

const tickerDictionary: Array<{ symbol: string; keywords: string[] }> = [
  { symbol: "NVDA", keywords: ["nvidia"] },
  { symbol: "AMD", keywords: ["amd", "advanced micro devices"] },
  { symbol: "SMH", keywords: ["semiconductor etf", "semiconductor"] },
  { symbol: "XLE", keywords: ["energy sector", "energy shares", "energy stocks"] },
  { symbol: "XOM", keywords: ["exxon", "exxon mobil"] },
  { symbol: "CVX", keywords: ["chevron"] },
  { symbol: "JPM", keywords: ["jpmorgan", "jp morgan"] },
  { symbol: "XLF", keywords: ["financial sector", "financial stocks"] },
  { symbol: "KBE", keywords: ["bank etf", "regional bank"] },
  { symbol: "SPY", keywords: ["s&p 500", "stocks", "equities"] },
  { symbol: "QQQ", keywords: ["nasdaq 100", "tech shares"] },
  { symbol: "TLT", keywords: ["treasury", "bond market", "yields"] }
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

export function inferSectors(text: string) {
  const normalized = normalizeText(text);
  const matches = sectorRules
    .filter((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))
    .map((rule) => rule.label);

  return matches.length > 0 ? Array.from(new Set(matches)) : ["Macro"];
}

export function inferTickers(text: string) {
  const normalized = normalizeText(text);
  const matches = tickerDictionary
    .filter((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)))
    .map((entry) => entry.symbol);

  return Array.from(new Set(matches));
}

export function inferSentiment(text: string) {
  const normalized = normalizeText(text);

  if (/\b(rally|gain|jump|surge|firm|beat|strong)\b/.test(normalized)) {
    return "bullish";
  }

  if (/\b(drop|fall|slump|fear|weak|miss|warning)\b/.test(normalized)) {
    return "bearish";
  }

  if (/\b(volatility|mixed|uncertain|watch|cautious)\b/.test(normalized)) {
    return "mixed";
  }

  return "neutral";
}

export function inferImportance(text: string, sourceWeight: number) {
  const normalized = normalizeText(text);
  let score = 6 + sourceWeight;

  if (/\b(fed|inflation|yield|treasury|jobs|cpi|ai|oil|banks)\b/.test(normalized)) {
    score += 1.2;
  }

  if (/\b(breaking|urgent|exclusive)\b/.test(normalized)) {
    score += 0.5;
  }

  return Number(Math.min(score, 10).toFixed(2));
}

const marketIncludeKeywords = [
  "stock",
  "stocks",
  "market",
  "markets",
  "fed",
  "yield",
  "treasury",
  "bond",
  "oil",
  "gold",
  "silver",
  "bank",
  "banks",
  "nasdaq",
  "s&p",
  "dow",
  "shares",
  "earnings",
  "ai",
  "chip",
  "semiconductor",
  "trade",
  "tariff",
  "economy",
  "inflation",
  "currency",
  "yen",
  "franc",
  "energy",
  "gas"
];

const marketExcludeKeywords = [
  "social security",
  "inherit",
  "savings",
  "retirement",
  "teacher",
  "rear-end my car",
  "disability benefits",
  "shoppers",
  "tax season",
  "what should i do",
  "will i ever earn",
  "refund from retailers"
];

export function isMarketRelevant(text: string) {
  const normalized = normalizeText(text);

  if (marketExcludeKeywords.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return marketIncludeKeywords.some((keyword) => normalized.includes(keyword));
}
