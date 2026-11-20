"use client";

import { useState } from "react";
import type { Overview } from "./data";
import styles from "./overview.module.css";

const series = [
  ["properties", "Properties", "blue"],
  ["tenants", "Tenants", "teal"],
  ["landlords", "Landlords", "green"],
  ["reviews", "Reviews", "violet"],
  ["flagged", "Reports", "amber"],
] as const;

export function ActivityChart({ rows }: { rows: Overview["trends"] }) {
  const [metric, setMetric] = useState<(typeof series)[number][0]>("properties");
  const maximum = Math.max(1, ...rows.map(row => row[metric]));

  return (
    <div>
      <div className={styles.chartControls} role="group" aria-label="Activity metric">
        {series.map(([key, label, tone]) => (
          <button type="button" key={key} data-tone={tone} aria-pressed={metric === key} onClick={() => setMetric(key)}>
            {label}
          </button>
        ))}
      </div>
      <ul className={styles.monthBars} aria-hidden="true" data-tone={series.find(([key]) => key === metric)?.[2]}>
        {rows.map(row => (
          <li key={row.month} className={styles.monthColumn}>
            <strong>{row[metric].toLocaleString("en-IN")}</strong>
            <div className={styles.monthTrack}>
              <span style={{ height: `${row[metric] / maximum * 100}%` }} />
            </div>
            <small>{row.month}</small>
          </li>
        ))}
      </ul>
      <div className={styles.tableRegion} tabIndex={0} role="region" aria-label="Monthly activity data">
        <table className={styles.activityTable}>
          <caption className="sr-only">Monthly platform activity by metric</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              {series.map(([key, label, tone]) => (
                <th key={key} scope="col" data-tone={tone} data-highlighted={metric === key || undefined}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.month}>
                <th scope="row">{row.month}</th>
                {series.map(([key, , tone]) => (
                  <td key={key} data-tone={tone} data-highlighted={metric === key || undefined}>
                    {row[key].toLocaleString("en-IN")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
