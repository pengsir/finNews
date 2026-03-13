"use client";

import { useEffect } from "react";

interface ReportViewTrackerProps {
  reportSlug: string;
}

export function ReportViewTracker({ reportSlug }: ReportViewTrackerProps) {
  useEffect(() => {
    const storageKey = `report-viewed:${reportSlug}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");

    void fetch(`/api/reports/${reportSlug}/view`, {
      method: "POST",
      keepalive: true
    }).catch(() => {
      window.sessionStorage.removeItem(storageKey);
    });
  }, [reportSlug]);

  return null;
}
