const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: "\"",
  lt: "<",
  gt: ">",
  nbsp: " "
};

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity: string) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity] ?? `&${entity};`;
  });
}
