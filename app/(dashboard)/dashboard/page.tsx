"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";

interface Stats {
  totalConversations: number;
  hrPolicyCount: number;
  generalCount: number;
  blockedCount: number;
  allowedUserCount: number;
  avgResponseMs: number | null;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-fg">Overview</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Snapshot of bot activity across all users.
      </p>

      {loading ? (
        <div className="mt-6 text-sm text-fg-muted">Loading stats…</div>
      ) : stats ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Total conversations" value={stats.totalConversations} />
            <StatCard label="HR policy answers" value={stats.hrPolicyCount} />
            <StatCard label="General answers" value={stats.generalCount} />
            <StatCard label="Blocked (not allowed)" value={stats.blockedCount} />
            <StatCard label="Allowed users" value={stats.allowedUserCount} />
            <StatCard
              label="Avg response time"
              value={stats.avgResponseMs !== null ? `${stats.avgResponseMs} ms` : "—"}
            />
          </div>

          <div className="mt-8 rounded-md border border-border bg-canvas p-4 shadow-card">
            <h2 className="text-sm font-semibold text-fg">Intent split</h2>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-canvas-subtle">
              {stats.totalConversations > 0 && (
                <div className="flex h-full w-full">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${(stats.hrPolicyCount / stats.totalConversations) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${(stats.generalCount / stats.totalConversations) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-danger"
                    style={{
                      width: `${(stats.blockedCount / stats.totalConversations) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-fg-muted">
              <span><span className="inline-block h-2 w-2 rounded-full bg-accent" /> HR policy</span>
              <span><span className="inline-block h-2 w-2 rounded-full bg-success" /> General</span>
              <span><span className="inline-block h-2 w-2 rounded-full bg-danger" /> Blocked</span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 text-sm text-danger">Failed to load stats.</div>
      )}
    </div>
  );
}
