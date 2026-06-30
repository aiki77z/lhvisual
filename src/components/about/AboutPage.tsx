import { affiliations, authors } from "../../data/paper";

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

export function AboutPage() {
  return (
    <article className="article-shell">
      <p className="eyebrow">Abstract</p>
      <h1>LoopsBench</h1>
      <p className="affil">
        {authors.map((a) => a.name).join(", ")} — {affiliations}
      </p>

      <section className="article-section">
        <p>
          Coding agent infrastructure is shifting from harness engineering toward
          loop engineering as LLM-based coding agents are deployed for sustained
          long-horizon software development. Existing benchmarks often center on
          localized tasks or emphasize end-state outcomes, offering limited
          insight into the loop engineering factors that shape sustained
          execution. LoopsBench represents each task as a dependency DAG over
          separately testable development units with source-evidenced
          prerequisite edges. It comprises 112 tasks recovered from authentic
          sources spanning 8 programming languages and 9 domains, and a
          flow-aware runtime releases tests along the ready frontier while
          retaining completed nodes as persistent regression obligations.
        </p>
      </section>

      <section className="article-section">
        <h2>Key findings</h2>
        {findings.map((f) => (
          <p key={f.h}>
            <strong style={{ color: "var(--text)" }}>{f.h}.</strong> {f.p}
          </p>
        ))}
      </section>

      <section className="article-section">
        <h2>Citation</h2>
        <pre className="citation-block">{citation}</pre>
      </section>
    </article>
  );
}
