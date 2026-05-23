"use client";

import type { ReactNode } from "react";

interface AdminPageHeaderMetric {
  label: string;
  value: string | number;
}

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: AdminPageHeaderMetric[];
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  metrics = [],
}: AdminPageHeaderProps) {
  return (
    <section className="af-page-hero">
      <div className="af-page-hero-copy">
        <div className="af-kicker">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        {metrics.length > 0 && (
          <div className="af-page-metrics">
            {metrics.map((metric) => (
              <div className="af-page-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="af-page-actions">{actions}</div>}
    </section>
  );
}
