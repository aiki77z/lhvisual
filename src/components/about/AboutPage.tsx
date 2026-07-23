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

const findings = [
  {
    h: "Long-horizon tasks remain far from solved",
    p: "Even the strongest model and loop configuration resolves 25.00% of the benchmark, so long-horizon execution stays well outside the reach of current coding agents.",
  },
  {
    h: "Agent behavior diverges from human development",
    p: "Recorded plans drop pull-request-level dependencies relative to the human DAG, patches inflate beyond the gold change set, and tests stay sparse, leaving earlier obligations unguarded as the horizon extends.",
  },
  {
    h: "Loops sustain execution, routing and memory stay weak",
    p: "Outer loops keep agents running across long horizons, yet task routing across handoffs and state retention under context compaction are where regressions concentrate.",
  },
];

const citation = `@misc{loopsbench2026,
  title  = {LoopsBench: From Harness Engineering to Loop Engineering in Coding Agent Evaluation},
  author = {Li, Han and Fang, Zhemin and Feng, Rili and others},
  year   = {2026}
}`;

const resources = [
  { label: "Paper", href: paperUrl },
  { label: "GitHub", href: repoUrl },
  { label: "Dataset", href: datasetUrl },
];

export function AboutPage() {
  return (
    <article className="article-shell about-shell">
      <header className="about-hero">
        <p className="eyebrow">Research paper</p>
        <h1>LoopsBench</h1>
        <p className="paper-title">
          From Harness Engineering to Loop Engineering in Coding Agent Evaluation
        </p>
        <p className="authors about-authors">
          {authors.map((author, index) => (
            <span key={author.name}>
              {author.href ? <a href={author.href}>{author.name}</a> : author.name}
              {index < authors.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <p className="affil">{affiliations}</p>
        <div className="about-resources" aria-label="Paper resources">
          {resources.map((resource) =>
            resource.href === "#" ? (
              <span key={resource.label} aria-disabled="true">
                {resource.label} <small>coming soon</small>
              </span>
            ) : (
              <a key={resource.label} href={resource.href}>
                {resource.label} <span aria-hidden="true">↗</span>
              </a>
            ),
          )}
        </div>
      </header>

      <div className="about-stat-grid" aria-label="Benchmark statistics">
        {stats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="article-section about-abstract">
        <p className="section-index">Abstract</p>
        <p>
          Coding agent infrastructure is shifting from harness engineering toward
          loop engineering as LLM-based coding agents are deployed for sustained
          long-horizon software development. Existing benchmarks often center on
          localized tasks or emphasize end-state outcomes, offering limited
          insight into the loop engineering factors that shape sustained
          execution. LoopsBench represents each task as a dependency DAG over
          separately testable development units with source-evidenced
          prerequisite edges. Its flow-aware runtime releases tests along the
          ready frontier while retaining completed nodes as persistent regression
          obligations.
        </p>
      </section>

      <section className="article-section">
        <div className="about-section-heading">
          <p className="section-index">Dataset</p>
          <h2>112 tasks from authentic development records</h2>
        </div>
        <div className="source-grid about-source-grid">
          {sources.map((source) => (
            <article className="source-card" key={source.title}>
              <div className="count">{source.count}</div>
              <h3>{source.title}</h3>
              <p>{source.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="article-section">
        <div className="about-section-heading">
          <p className="section-index">Positioning</p>
          <h2>Designed for multi-unit, dependency-aware work</h2>
        </div>
        <div className="table-frame about-table">
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
              {comparisonRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.self ? <strong>{row.name}</strong> : row.name}</td>
                  <td>{row.multi ? "yes" : "no"}</td>
                  <td>{row.dag ? "yes" : "no"}</td>
                  <td className="numeric">{row.patch}</td>
                  <td className="numeric">{row.tests}</td>
                  <td className="numeric">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="article-section">
        <div className="about-section-heading">
          <p className="section-index">Findings</p>
          <h2>What the benchmark reveals</h2>
        </div>
        <div className="findings-list">
          {findings.map((finding, index) => (
            <article key={finding.h}>
              <span>0{index + 1}</span>
              <div>
                <h3>{finding.h}</h3>
                <p>{finding.p}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="article-section">
        <div className="about-section-heading">
          <p className="section-index">Reference</p>
          <h2>Citation</h2>
        </div>
        <pre className="citation-block">{citation}</pre>
      </section>
    </article>
  );
}
