import { prisma } from "@/server/db/prisma";
import { slugifyTopic, toIsoMarketDate } from "@/lib/format";

export type ArchiveSort = "recent" | "events" | "stocks";
export type SearchScope = "all" | "reports" | "events" | "stocks";
export type SearchSort = "relevance" | "latest";

function logPublicDataFallback(scope: string, error: unknown) {
  console.warn(`[public-content] Falling back in ${scope}.`, error);
}

async function withPublicDataFallback<T>(
  scope: string,
  action: () => Promise<T>,
  fallback: T
) {
  try {
    return await action();
  } catch (error) {
    logPublicDataFallback(scope, error);
    return fallback;
  }
}

export async function getSiteNavigationData() {
  return withPublicDataFallback(
    "getSiteNavigationData",
    async () => {
      const reports = await prisma.dailyReport.findMany({
        where: {
          status: "PUBLISHED"
        },
        orderBy: {
          marketDate: "desc"
        },
        take: 12,
        include: {
          events: {
            include: {
              event: true
            }
          }
        }
      });

      const sectorCounts = new Map<string, number>();

      for (const report of reports) {
        for (const link of report.events) {
          for (const sector of link.event.sectors) {
            sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
          }
        }
      }

      return {
        latestReportDateLabel: reports[0]?.marketDate
          ? reports[0].marketDate.toISOString().slice(0, 10)
          : "No published edition",
        recentReports: reports.slice(0, 6).map((report) => ({
          slug: report.slug,
          title: report.title,
          marketDate: report.marketDate,
          marketDateIso: toIsoMarketDate(report.marketDate)
        })),
        topSectors: [...sectorCounts.entries()]
          .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
          .slice(0, 6)
          .map(([label, count]) => ({
            label,
            slug: slugifyTopic(label),
            count
          }))
      };
    },
    {
      latestReportDateLabel: "No published edition",
      recentReports: [],
      topSectors: []
    }
  );
}

export async function getPublishedReportByDate(marketDateIso: string) {
  const start = new Date(`${marketDateIso}T00:00:00.000Z`);
  const end = new Date(`${marketDateIso}T23:59:59.999Z`);

  return withPublicDataFallback(
    "getPublishedReportByDate",
    async () =>
      prisma.dailyReport.findFirst({
        where: {
          status: "PUBLISHED",
          marketDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          events: {
            include: {
              event: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          },
          stockFocuses: true
        }
      }),
    null
  );
}

export async function getTopicPageData(topicSlug: string) {
  return withPublicDataFallback(
    "getTopicPageData",
    async () => {
      const reports = await prisma.dailyReport.findMany({
        where: {
          status: "PUBLISHED"
        },
        orderBy: {
          marketDate: "desc"
        },
        take: 20,
        include: {
          events: {
            include: {
              event: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          },
          stockFocuses: true
        }
      });

      const matchingReports = reports
        .map((report) => {
          const matchingEvents = report.events.filter((link) =>
            link.event.sectors.some((sector) => slugifyTopic(sector) === topicSlug)
          );

          if (matchingEvents.length === 0) {
            return null;
          }

          return {
            ...report,
            matchingEvents
          };
        })
        .filter((report): report is NonNullable<typeof report> => Boolean(report));

      const topicLabel =
        matchingReports[0]?.matchingEvents[0]?.event.sectors.find(
          (sector) => slugifyTopic(sector) === topicSlug
        ) ?? null;

      const relatedStocks = Array.from(
        new Map(
          matchingReports
            .flatMap((report) => report.stockFocuses)
            .map((focus) => [focus.symbol, focus])
        ).values()
      ).slice(0, 6);

      return {
        topicLabel,
        reports: matchingReports,
        relatedStocks
      };
    },
    {
      topicLabel: null,
      reports: [],
      relatedStocks: []
    }
  );
}

export async function getLatestPublishedReport() {
  return withPublicDataFallback(
    "getLatestPublishedReport",
    async () =>
      prisma.dailyReport.findFirst({
        where: {
          status: "PUBLISHED"
        },
        orderBy: {
          marketDate: "desc"
        },
        include: {
          events: {
            orderBy: {
              sortOrder: "asc"
            },
            include: {
              event: true
            }
          },
          stockFocuses: true,
          manualEdits: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        }
      }),
    null
  );
}

export async function getPublishedReports(
  limit = 30,
  sort: ArchiveSort = "recent"
) {
  return withPublicDataFallback(
    "getPublishedReports",
    async () => {
      const reports = await prisma.dailyReport.findMany({
        where: {
          status: "PUBLISHED"
        },
        orderBy: {
          marketDate: "desc"
        },
        take: limit,
        include: {
          events: {
            include: {
              event: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          },
          stockFocuses: true
        }
      });

      const sortedReports = [...reports];

      if (sort === "events") {
        sortedReports.sort((left, right) => {
          return (
            right.events.length - left.events.length ||
            right.marketDate.getTime() - left.marketDate.getTime()
          );
        });
      }

      if (sort === "stocks") {
        sortedReports.sort((left, right) => {
          return (
            right.stockFocuses.length - left.stockFocuses.length ||
            right.marketDate.getTime() - left.marketDate.getTime()
          );
        });
      }

      return sortedReports;
    },
    []
  );
}

export async function getReportBySlug(slug: string) {
  return prisma.dailyReport.findUnique({
    where: {
      slug
    },
    include: {
      events: {
        include: {
          event: {
            include: {
              sources: {
                include: {
                  rawNewsItem: {
                    include: {
                      source: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          sortOrder: "asc"
        }
      },
      stockFocuses: true,
      manualEdits: {
        orderBy: {
          createdAt: "desc"
        },
        take: 5
      }
    }
  });
}

export async function getNewsEventByIdOrSlug(identifier: string) {
  return prisma.newsEvent.findFirst({
    where: {
      OR: [
        {
          id: identifier
        },
        {
          slug: identifier
        }
      ]
    },
    include: {
      reportLinks: {
        include: {
          report: true
        },
        orderBy: {
          sortOrder: "asc"
        }
      },
      sources: {
        include: {
          rawNewsItem: {
            include: {
              source: true
            }
          }
        }
      }
    }
  });
}

export async function getStockPageData(symbol: string) {
  return prisma.stockFocus.findMany({
    where: {
      symbol: {
        equals: symbol,
        mode: "insensitive"
      }
    },
    orderBy: {
      report: {
        marketDate: "desc"
      }
    },
    include: {
      report: {
        include: {
          events: {
            include: {
              event: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      }
    }
  });
}

function normalizeQuery(value: string) {
  return value.trim();
}

function getMatchScore(source: string, query: string) {
  const haystack = source.toLowerCase();
  const needle = query.toLowerCase();

  if (!haystack || !needle) {
    return 0;
  }

  if (haystack === needle) {
    return 120;
  }

  if (haystack.startsWith(needle)) {
    return 80;
  }

  if (haystack.includes(needle)) {
    return 40;
  }

  return 0;
}

export async function searchPublicContent(
  query: string,
  options: {
    scope?: SearchScope;
    sort?: SearchSort;
  } = {}
) {
  const trimmedQuery = normalizeQuery(query);
  const scope = options.scope ?? "all";
  const sort = options.sort ?? "relevance";

  if (!trimmedQuery) {
    return {
      reports: [],
      events: [],
      stocks: []
    };
  }

  const reports = scope === "all" || scope === "reports"
    ? await prisma.dailyReport.findMany({
    where: {
      OR: [
        {
          title: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          contentZhEn: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          events: {
            some: {
              event: {
                OR: [
                  {
                    title: {
                      contains: trimmedQuery,
                      mode: "insensitive"
                    }
                  },
                  {
                    summary: {
                      contains: trimmedQuery,
                      mode: "insensitive"
                    }
                  },
                  {
                    tickers: {
                      has: trimmedQuery.toUpperCase()
                    }
                  },
                  {
                    sectors: {
                      has: trimmedQuery
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    },
    orderBy: {
      marketDate: "desc"
    },
    include: {
      events: {
        include: {
          event: true
        },
        orderBy: {
          sortOrder: "asc"
        }
      },
      stockFocuses: true
    },
    take: 10
  })
    : [];

  const events = scope === "all" || scope === "events"
    ? await prisma.newsEvent.findMany({
    where: {
      OR: [
        {
          title: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          tickers: {
            has: trimmedQuery.toUpperCase()
          }
        },
        {
          sectors: {
            has: trimmedQuery
          }
        }
      ]
    },
    include: {
      reportLinks: {
        include: {
          report: true
        },
        orderBy: {
          report: {
            marketDate: "desc"
          }
        }
      },
      sources: {
        include: {
          rawNewsItem: {
            include: {
              source: true
            }
          }
        }
      }
    },
    orderBy: {
      importanceScore: "desc"
    },
    take: 12
  })
    : [];

  const stocks = scope === "all" || scope === "stocks"
    ? await prisma.stockFocus.findMany({
    where: {
      OR: [
        {
          symbol: {
            contains: trimmedQuery.toUpperCase(),
            mode: "insensitive"
          }
        },
        {
          company: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          thesis: {
            contains: trimmedQuery,
            mode: "insensitive"
          }
        },
        {
          report: {
            events: {
              some: {
                event: {
                  OR: [
                    {
                      tickers: {
                        has: trimmedQuery.toUpperCase()
                      }
                    },
                    {
                      title: {
                        contains: trimmedQuery,
                        mode: "insensitive"
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    },
    include: {
      report: true
    },
    orderBy: {
      report: {
        marketDate: "desc"
      }
    },
    take: 12
  })
    : [];

  if (sort === "relevance") {
    reports.sort((left, right) => {
      const leftScore =
        getMatchScore(left.title, trimmedQuery) +
        getMatchScore(left.summary, trimmedQuery) +
        getMatchScore(left.contentZhEn, trimmedQuery);
      const rightScore =
        getMatchScore(right.title, trimmedQuery) +
        getMatchScore(right.summary, trimmedQuery) +
        getMatchScore(right.contentZhEn, trimmedQuery);

      return rightScore - leftScore || right.marketDate.getTime() - left.marketDate.getTime();
    });

    events.sort((left, right) => {
      const leftScore =
        getMatchScore(left.title, trimmedQuery) +
        getMatchScore(left.summary, trimmedQuery) +
        getMatchScore(left.tickers.join(" "), trimmedQuery) +
        getMatchScore(left.sectors.join(" "), trimmedQuery);
      const rightScore =
        getMatchScore(right.title, trimmedQuery) +
        getMatchScore(right.summary, trimmedQuery) +
        getMatchScore(right.tickers.join(" "), trimmedQuery) +
        getMatchScore(right.sectors.join(" "), trimmedQuery);

      return rightScore - leftScore || right.importanceScore - left.importanceScore;
    });

    stocks.sort((left, right) => {
      const leftScore =
        getMatchScore(left.symbol, trimmedQuery) +
        getMatchScore(left.company ?? "", trimmedQuery) +
        getMatchScore(left.thesis, trimmedQuery);
      const rightScore =
        getMatchScore(right.symbol, trimmedQuery) +
        getMatchScore(right.company ?? "", trimmedQuery) +
        getMatchScore(right.thesis, trimmedQuery);

      return (
        rightScore - leftScore ||
        right.report.marketDate.getTime() - left.report.marketDate.getTime()
      );
    });
  }

  return {
    reports,
    events,
    stocks
  };
}
