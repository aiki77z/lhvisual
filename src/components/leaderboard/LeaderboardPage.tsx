import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { leaderboardEntries, sweeps, type SweepName } from "../../data/leaderboard";
import { LeaderboardTable } from "./LeaderboardTable";

export function LeaderboardPage() {
  const [sweep, setSweep] = useState<SweepName>("model");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[sweep];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [sweep]);

  const entries = useMemo(
    () =>
      leaderboardEntries
        .filter((e) => e.sweep === sweep)
        .sort((a, b) => b.rrLoop - a.rrLoop),
    [sweep],
  );

  const top = entries[0];

  const summary = [
    { label: "Top resolve rate", value: `${top.rrLoop.toFixed(2)}%`, detail: top.model },
    { label: "Systems", value: `${entries.length}`, detail: "evaluated configurations" },
    { label: "Tasks", value: "112", detail: "full release" },
    { label: "Dev units", value: "5,300+", detail: "across 8 languages" },
  ];

  return (
    <div className="site-container page-stack">
      <section className="lb-hero">
        <p className="eyebrow">Leaderboard · RQ1</p>
        <h1>Long-horizon resolve rates</h1>
        <p>
          Resolve Rate (RR) and Test Pass Rate (TPR) with and without the outer
          evaluation loop. Depth is normalized dependency layer depth; tokens are
          mean billed tokens per task.
        </p>
      </section>

      <div className="summary-grid">
        {summary.map((s) => (
          <article className="summary-card" key={s.label}>
            <p>{s.label}</p>
            <strong>{s.value}</strong>
            <span>{s.detail}</span>
          </article>
        ))}
      </div>

      <div className="tabs" role="tablist">
        <span
          className="tab-indicator"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden="true"
        />
        {sweeps.map((s) => (
          <button
            key={s.id}
            ref={(el) => {
              tabRefs.current[s.id] = el;
            }}
            className={`tab ${sweep === s.id ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={sweep === s.id}
            onClick={() => setSweep(s.id)}
          >
            {s.label}
            <small>{s.detail}</small>
          </button>
        ))}
      </div>

      <section className="data-section">
        <div className="section-heading">
          <h2>{sweeps.find((s) => s.id === sweep)?.label}</h2>
          <p>{entries.length} configurations</p>
        </div>
        <LeaderboardTable entries={entries} />
      </section>
    </div>
  );
}
