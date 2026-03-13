interface MockEventSeed {
  eventKey: string;
  title: string;
  summary: string;
  sectors: string[];
  tickers: string[];
  sentiment: string;
  importanceHint: number;
}

const sharedEvents: MockEventSeed[] = [
  {
    eventKey: "fed-rate-outlook",
    title: "Treasury yields ease as traders reassess the Fed path",
    summary:
      "Rates-sensitive assets stabilize after traders dial back near-term policy fears ahead of fresh macro data.",
    sectors: ["Macro", "Financials", "Growth"],
    tickers: ["SPY", "QQQ", "TLT"],
    sentiment: "neutral",
    importanceHint: 8.7
  },
  {
    eventKey: "ai-capex-semiconductors",
    title: "AI capex expectations keep semiconductor leadership intact",
    summary:
      "Large-cap chip names stay firm as enterprise and hyperscaler demand continue to support the AI buildout narrative.",
    sectors: ["Technology", "Semiconductors"],
    tickers: ["NVDA", "AMD", "SMH"],
    sentiment: "bullish",
    importanceHint: 9.3
  },
  {
    eventKey: "energy-oil-volatility",
    title: "Oil volatility keeps energy names in tactical focus",
    summary:
      "Commodity swings create both opportunity and gap risk for energy majors heading into the opening bell.",
    sectors: ["Energy"],
    tickers: ["XLE", "XOM", "CVX"],
    sentiment: "mixed",
    importanceHint: 7.8
  },
  {
    eventKey: "banks-credit-tone",
    title: "Bank shares watch credit tone as yields pull back",
    summary:
      "A softer rates backdrop helps valuation pressure, but traders still want clarity on credit quality and loan demand.",
    sectors: ["Financials", "Banks"],
    tickers: ["JPM", "XLF", "KBE"],
    sentiment: "neutral",
    importanceHint: 7.1
  }
];

const sourceCoverage: Record<string, string[]> = {
  "wsj-markets": [
    "fed-rate-outlook",
    "ai-capex-semiconductors",
    "energy-oil-volatility"
  ],
  "cnbc-markets": [
    "ai-capex-semiconductors",
    "fed-rate-outlook",
    "banks-credit-tone"
  ],
  "marketwatch-top-stories": [
    "energy-oil-volatility",
    "fed-rate-outlook",
    "banks-credit-tone"
  ]
};

export function getMockEventsForSource(sourceSlug: string) {
  const coverage = sourceCoverage[sourceSlug] ?? sharedEvents.map((event) => event.eventKey);

  return coverage
    .map((eventKey) => sharedEvents.find((event) => event.eventKey === eventKey))
    .filter((event): event is MockEventSeed => Boolean(event));
}
