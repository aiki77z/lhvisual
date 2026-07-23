import { useState } from "react";

type Stage = "edit" | "snapshot" | "verify";

const stages: {
  id: Stage;
  number: string;
  label: string;
  detail: string;
}[] = [
  {
    id: "edit",
    number: "01",
    label: "Edit continuously",
    detail: "The agent writes only to the live workspace in Container A.",
  },
  {
    id: "snapshot",
    number: "02",
    label: "Queue real changes",
    detail: "Qualifying diffs become monotonic snapshots at real change points.",
  },
  {
    id: "verify",
    number: "03",
    label: "Verify independently",
    detail: "The host runtime activates frontier scoring, runs B, and records obligations.",
  },
];

const backgroundTerms = [
  { text: "git diff --cached", className: "term-a" },
  { text: "requirements/", className: "term-b" },
  { text: "plan.json", className: "term-c" },
  { text: "pytest -q", className: "term-d" },
  { text: "snapshot_042", className: "term-e" },
  { text: "newly_passed", className: "term-f" },
  { text: "regression", className: "term-g" },
  { text: "ready_frontier", className: "term-h" },
  { text: "observation_history", className: "term-i" },
  { text: "test_symbols.py", className: "term-j" },
];

function ContainerGlyph({ test = false }: { test?: boolean }) {
  return (
    <svg className="container-glyph" viewBox="0 0 64 52" aria-hidden="true">
      <rect x="7" y="10" width="14" height="12" rx="2" />
      <rect x="25" y="10" width="14" height="12" rx="2" />
      <rect x="43" y="10" width="14" height="12" rx="2" />
      <path d="M5 27h54l-4 10c-1.4 3.4-4.8 5.7-8.5 5.7h-29c-3.7 0-7.1-2.3-8.5-5.7L5 27Z" />
      {test ? (
        <path className="glyph-accent" d="m24 34 5 5 11-12" />
      ) : (
        <path className="glyph-accent" d="m25 30-5 4 5 4m14-8 5 4-5 4" />
      )}
    </svg>
  );
}

export function DualContainerDiagram() {
  const [activeStage, setActiveStage] = useState<Stage>("edit");

  const active = stages.find((stage) => stage.id === activeStage) ?? stages[0];

  return (
    <div className={`dual-container-diagram stage-${activeStage}`}>
      <div className="diagram-terms" aria-hidden="true">
        {backgroundTerms.map((term) => (
          <span className={term.className} key={term.text}>
            {term.text}
          </span>
        ))}
      </div>

      <div className="container-flow">
        <article
          className="runtime-container workspace-container"
          onMouseEnter={() => setActiveStage("edit")}
        >
          <div className="container-chrome">
            <span />
            <span />
            <span />
            <code>container-a:/workspace</code>
          </div>
          <div className="container-body">
            <div className="container-title-row">
              <ContainerGlyph />
              <div>
                <small>SOLE WRITE TARGET</small>
                <h3>Agent workspace</h3>
              </div>
            </div>
            <div className="workspace-terminal" aria-hidden="true">
              <p><i className="prompt">$</i> agent <em>--goal</em> implement units</p>
              <p><i className="prompt">›</i> edit src/parser.py</p>
              <p><i className="prompt">›</i> run attached tests</p>
              <p className="terminal-ok"><i>+</i> 128 lines changed</p>
            </div>
            <div className="container-status">
              <span className="live-dot" />
              loop keeps editing
            </div>
          </div>
        </article>

        <div
          className="snapshot-transfer"
          onMouseEnter={() => setActiveStage("snapshot")}
        >
          <svg className="flow-lines" viewBox="0 0 260 180" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 8 4 0 8Z" />
              </marker>
            </defs>
            <path className="snapshot-path" d="M8 48 C75 12 184 12 252 48" markerEnd="url(#flow-arrow)" />
          </svg>
          <div className="transfer-label transfer-label-top">
            <span>snapshot / diff</span>
            <code>poll every Δt</code>
          </div>
          <div className="snapshot-stack" aria-hidden="true">
            <i />
            <i />
            <div>
              <span>snapshot_042</span>
              <code>+128&nbsp; −14</code>
            </div>
          </div>
        </div>

        <article
          className="runtime-container watcher-container"
          onMouseEnter={() => setActiveStage("verify")}
        >
          <div className="container-chrome">
            <span />
            <span />
            <span />
            <code>container-b:/workspace</code>
          </div>
          <div className="container-body">
            <div className="container-title-row">
              <ContainerGlyph test />
              <div>
                <small>ISOLATED TEST EXECUTION</small>
                <h3>Tester container</h3>
              </div>
            </div>
            <div className="test-list" aria-hidden="true">
              <p><span>test_parser.py</span><i className="test-pass">pass</i></p>
              <p><span>test_lexer.py</span><i className="test-pass">pass</i></p>
              <p><span>test_symbols.py</span><i className="test-active">active</i></p>
              <p><span>test_codegen.py</span><i className="test-sealed">inactive</i></p>
            </div>
            <div className="trace-output" aria-hidden="true">
              <span>→</span>
              <code>host evaluation runtime</code>
              <small>results / logs</small>
            </div>
            <div className="container-status">
              <span className="watch-dot" />
              tests run in isolation
            </div>
          </div>
        </article>
      </div>

      <div className="flow-stage-picker" role="group" aria-label="Dual-container evaluation stages">
        {stages.map((stage) => (
          <button
            className={activeStage === stage.id ? "active" : ""}
            key={stage.id}
            type="button"
            aria-pressed={activeStage === stage.id}
            onClick={() => setActiveStage(stage.id)}
            onMouseEnter={() => setActiveStage(stage.id)}
            onFocus={() => setActiveStage(stage.id)}
          >
            <span>{stage.number}</span>
            {stage.label}
          </button>
        ))}
      </div>
      <p className="stage-description">
        <span>{active.number}</span>
        {active.detail}
      </p>
    </div>
  );
}
