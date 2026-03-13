"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AdminJobPollerProps {
  jobId: string;
}

export function AdminJobPoller({ jobId }: AdminJobPollerProps) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const response = await fetch(`/api/admin/jobs/${jobId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          status?: string;
        };

        if (!stopped && payload.status && payload.status !== "RUNNING") {
          stopped = true;
          router.refresh();
        }
      } catch {
        // Ignore transient polling failures.
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [jobId, router]);

  return null;
}
