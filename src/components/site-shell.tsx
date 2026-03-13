import type { ReactNode } from "react";
import type { Route } from "next";
import { formatMarketDate } from "@/lib/format";
import { SiteSidebar } from "@/components/site-sidebar";
import { getSiteNavigationData } from "@/server/queries/public-content";

export async function SiteShell({ children }: { children: ReactNode }) {
  const navigation = await getSiteNavigationData();
  type RecentReport = (typeof navigation.recentReports)[number];
  type TopSector = (typeof navigation.topSectors)[number];

  return (
    <div className="site-frame">
      <SiteSidebar
        latestLabel={navigation.latestReportDateLabel}
        primaryLinks={[
          { href: "/" as Route, label: "Front Page" },
          { href: "/archive" as Route, label: "Archive" },
          { href: "/search" as Route, label: "Search" },
          { href: "/admin" as Route, label: "Admin Desk" }
        ]}
        recentReports={navigation.recentReports.map((report: RecentReport) => ({
          href: `/editions/${report.marketDateIso}` as Route,
          label: report.title,
          dateLabel: formatMarketDate(report.marketDate)
        }))}
        sectorLinks={navigation.topSectors.map((sector: TopSector) => ({
          label: sector.label,
          count: sector.count,
          href: `/topics/${sector.slug}` as Route
        }))}
      />
      <div className="site-content">{children}</div>
    </div>
  );
}
