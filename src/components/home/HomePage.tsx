import {
  affiliations,
  authors,
  comparisonRows,
  datasetUrl,
  paperUrl,
  repoUrl,
  sources,
  stats,
} from "../../data/paper";
import { toAppPath } from "../../lib/site";
import { HeroDag } from "./HeroDag";

export function HomePage() {
  return (
    <div className="site-container">
      <section className="hero">
        <HeroDag />
        <div className="hero-inner">
          <p className="eyebrow">EMNLP · benchmark</p>
          <h1>
            <span className="accent">LoopsBench</span>: From Harness Engineering
            to Loop Engineering in Coding Agent Evaluation
          </h1>
          <p className="hero-sub">
            A long-horizon benchmark for loop engineering. Each task is a
            dependency DAG over separately testable development units, and a
            flow-aware runtime releases tests along the ready frontier while
            holding completed units as regression obligations.
          </p>
          <p className="authors">
            {authors.map((a, i) => (
              <span key={a.name}>
                {a.href ? <a href={a.href}>{a.name}</a> : a.name}
                {i < authors.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
          <p className="affil">{affiliations}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={paperUrl}>
              Paper
            </a>
            <a className="btn" href={repoUrl}>
              GitHub
            </a>
            <a className="btn" href={datasetUrl}>
              Dataset
            </a>
            <a className="btn" href={toAppPath("/leaderboard")}>
              Leaderboard
            </a>
          </div>

          <div className="stat-strip">
            {stats.map((s) => (
              <div className="stat-cell" key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2>Three authentic sources</h2>
        <p className="section-lede">
          112 tasks recovered from real development records, with prerequisite
          structure taken from source evidence rather than fabricated
          decompositions.
        </p>
        <div className="source-grid">
          {sources.map((s) => (
            <article className="source-card" key={s.title}>
              <div className="count">{s.count}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>Where it sits</h2>
        <p className="section-lede">
          LoopsBench pairs an executable dependency DAG with a flow-aware runtime
          that records loop-trace metrics for routing, state retention, and
          regression obligations.
        </p>
        <div className="data-section">
          <div className="table-frame">
            <table>
              <thead>
                <tr>
                  <th>Benchmark</th>
                  <th>Multi-unit</th>
                  <th>DAG</th>
                  <th className="numeric">Patch</th>
                  <th className="numeric">Tests</th>
                  <th className="numeric">Human time</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.self ? <strong style={{ color: "var(--accent)" }}>{r.name}</strong> : r.name}</td>
                    <td>{r.multi ? "yes" : "no"}</td>
                    <td>{r.dag ? "yes" : "no"}</td>
                    <td className="numeric">{r.patch}</td>
                    <td className="numeric">{r.tests}</td>
                    <td className="numeric">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Frontier coding agents stay below complete resolution</h2>
          <p>The strongest model and loop configuration resolves 25.00% of tasks.</p>
        </div>
        <a className="btn btn-primary" href={toAppPath("/leaderboard")}>
          View leaderboard
        </a>
      </section>
    </div>
  );
}
