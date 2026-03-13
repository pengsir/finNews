const reportDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York"
});

export function formatMarketDate(date: Date) {
  return reportDateFormatter.format(date);
}

export function toTitleSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function toIsoMarketDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function slugifyTopic(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
