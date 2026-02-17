import { useEffect, useState } from "react";
import { api } from "../api/client";

const PRIORITY_COLORS = {
  low: "#4a9a5a",
  medium: "#c8a840",
  high: "#d0724a",
  critical: "#d04a4a",
};

const CATEGORY_COLORS = {
  billing: "#9b7cf0",
  technical: "#5ab4f0",
  account: "#27c96a",
  general: "#7a7a99",
};

function BreakdownBars({ data, colors, total }) {
  return (
    <div>
      {Object.entries(data).map(([key, count]) => (
        <div key={key} className="breakdown-row">
          <span className="breakdown-label">{key}</span>
          <div className="breakdown-bar-track">
            <div
              className="breakdown-bar-fill"
              style={{
                width: total > 0 ? `${(count / total) * 100}%` : "0%",
                background: colors[key] || "#666",
              }}
            />
          </div>
          <span className="breakdown-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsDashboard({ refreshKey }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading && !stats) {
    return (
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-label">Loading…</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <span className="stat-label">Total Tickets</span>
        <span className="stat-value">{stats.total_tickets}</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Open</span>
        <span className="stat-value" style={{ color: "#5ab4f0" }}>
          {stats.open_tickets}
        </span>
        <span className="stat-sub">
          {stats.total_tickets > 0
            ? `${Math.round((stats.open_tickets / stats.total_tickets) * 100)}% of total`
            : "—"}
        </span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Avg / Day</span>
        <span className="stat-value">{stats.avg_tickets_per_day}</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">By Priority</span>
        <BreakdownBars
          data={stats.priority_breakdown}
          colors={PRIORITY_COLORS}
          total={stats.total_tickets}
        />
      </div>

      <div className="stat-card">
        <span className="stat-label">By Category</span>
        <BreakdownBars
          data={stats.category_breakdown}
          colors={CATEGORY_COLORS}
          total={stats.total_tickets}
        />
      </div>
    </div>
  );
}
