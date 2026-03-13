"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarLink {
  href: Route;
  label: string;
}

interface SidebarReportLink {
  href: Route;
  label: string;
  dateLabel: string;
}

interface SidebarSectorLink {
  label: string;
  href: Route;
  count: number;
}

interface SiteSidebarProps {
  latestLabel: string;
  primaryLinks: SidebarLink[];
  recentReports: SidebarReportLink[];
  sectorLinks: SidebarSectorLink[];
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteSidebar({
  latestLabel,
  primaryLinks,
  recentReports,
  sectorLinks
}: SiteSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="site-sidebar">
      <div className="sidebar-brand">
        <Link className="sidebar-logo" href="/">
          Fin News
        </Link>
        <p className="sidebar-tagline">
          Bilingual market briefings before the opening bell.
        </p>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">Edition</p>
        <p className="sidebar-edition">{latestLabel}</p>
      </div>

      <nav className="sidebar-section" aria-label="Primary">
        <p className="sidebar-label">Navigate</p>
        <div className="sidebar-link-list">
          {primaryLinks.map((link: SidebarLink) => (
            <Link
              className={`sidebar-link ${isActivePath(pathname, link.href) ? "sidebar-link-active" : ""}`}
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-section">
        <p className="sidebar-label">By Date</p>
        <div className="sidebar-link-list">
          {recentReports.map((report: SidebarReportLink) => (
            <Link
              className="sidebar-link"
              href={report.href}
              key={report.label}
            >
              <span className="sidebar-link-title">{report.dateLabel}</span>
              <span className="sidebar-link-meta sidebar-link-meta-clamp">{report.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">By Category</p>
        <div className="sidebar-link-list">
          {sectorLinks.map((sector: SidebarSectorLink) => (
            <Link className="sidebar-link" href={sector.href} key={sector.label}>
              <span>{sector.label}</span>
              <span className="sidebar-count">{sector.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
