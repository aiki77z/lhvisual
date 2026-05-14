import type { BlogMetric } from "../../data/posts";

type BlogMetricGridProps = {
  metrics: BlogMetric[];
};

export function BlogMetricGrid({ metrics }: BlogMetricGridProps) {
  return (
    <div className="article-metric-grid" aria-label="Task category metrics">
      {metrics.map((metric) => (
        <article key={metric.label}>
          <p>{metric.label}</p>
          <strong>{metric.value}</strong>
          <span>{metric.description}</span>
        </article>
      ))}
    </div>
  );
}
