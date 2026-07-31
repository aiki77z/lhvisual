import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  difficultyBuckets,
  leaderboardEntries,
  sweeps,
  type DifficultyName,
  type LeaderboardEntry,
  type SweepName,
} from "../../data/leaderboard";
import { LeaderboardTable } from "./LeaderboardTable";

function entryLabel(entry: LeaderboardEntry, sweep: SweepName) {
  return sweep === "model" ? entry.model : entry.loop;
}

function difficultyScore(entry: LeaderboardEntry, difficulty: DifficultyName) {
  return entry.difficultyScores.find((score) => score.difficulty === difficulty);
}

function DifficultyScoreCharts({ entries, sweep }: { entries: LeaderboardEntry[]; sweep: SweepName }) {
  const maxScore = Math.max(
    1,
    ...entries.flatMap((entry) => entry.difficultyScores.map((score) => score.rr)),
  );

  return (
    <section className="difficulty-score-section" aria-label="Resolve rate by task difficulty">
      <div className="section-heading">
        <h2>Difficulty breakdown</h2>
        <p>{sweep === "model" ? "Models" : "Agents"} scored separately on easy, medium, and hard tasks</p>
      </div>

      <div className="difficulty-chart-grid">
        {difficultyBuckets.map((bucket) => (
          <article className="difficulty-chart-card" key={bucket.id}>
            <header>
              <div>
                <h3>{bucket.label}</h3>
                <p>{bucket.total} tasks</p>
              </div>
              <span>RR w/ loop</span>
            </header>

            <div className="difficulty-bars">
              {entries.map((entry) => {
                const score = difficultyScore(entry, bucket.id);
                const value = score?.rr ?? 0;
                return (
                  <div className="difficulty-bar-row" key={`${bucket.id}-${entry.id}`}>
                    <span className="difficulty-bar-label">{entryLabel(entry, sweep)}</span>
                    <div className="difficulty-bar-track" aria-hidden="true">
                      <span style={{ width: `${Math.max(2, (value / maxScore) * 100)}%` }} />
                    </div>
                    <strong>{value.toFixed(1)}%</strong>
                    <small>
                      {score?.resolved ?? 0}/{score?.total ?? bucket.total}
                    </small>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

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
    { label: "Top resolve rate", value: `${top.rrLoop.toFixed(2)}%`, detail: entryLabel(top, sweep) },
    { label: "Systems", value: `${entries.length}`, detail: "evaluated configurations" },
    { label: "Tasks", value: "112", detail: "full release" },
    { label: "Difficulty split", value: "3", detail: "easy / medium / hard" },
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
        <LeaderboardTable entries={entries} sweep={sweep} />
      </section>

      <DifficultyScoreCharts entries={entries} sweep={sweep} />
    </div>
  );
}
