"use client";
import { useState } from "react";
import type { Overview } from "./data";
const series = [
  ["properties", "Properties"], ["tenants", "Tenants"], ["landlords", "Landlords"],
  ["reviews", "Reviews"], ["flagged", "Reports"],
] as const;
export function ActivityChart({ rows }: { rows: Overview["trends"] }) {
  const [metric, setMetric] = useState<(typeof series)[number][0]>("properties");
  const maximum = Math.max(1, ...rows.map(row => row[metric]));
  return <div className="admin-activity-chart">
    <div className="admin-chart-controls" role="group" aria-label="Activity metric">
      {series.map(([key, label]) => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{label}</button>)}
    </div>
    <div className="admin-month-bars" aria-label={`${series.find(([key]) => key === metric)?.[1]} submitted by month`}>
      {rows.map(row => <div key={row.month} className="admin-month-column">
        <strong>{row[metric]}</strong><div className="admin-month-track" aria-hidden="true"><span style={{ height: `${row[metric] / maximum * 100}%` }} /></div><small>{row.month}</small>
      </div>)}
    </div>
  </div>;
}
