import {
  constructionStages,
  instrumentationTracks,
  pipelinePhases,
  relationSignals,
  sourceStreams,
  unitFields,
  validationTrials,
} from "../../data/pipeline";
import { paperUrl } from "../../data/paper";
import { toAppPath } from "../../lib/site";

const dagNodes = [
  ["u1", "U1", "parser"],
  ["u2", "U2", "lexer"],
  ["u3", "U3", "AST"],
  ["u4", "U4", "symbols"],
  ["u5", "U5", "types"],
  ["u6", "U6", "codegen"],
  ["u7", "U7", "optimizer"],
] as const;

export function PipelinePage() {
  return (
    <article className="pipeline-paper-page">
      <header className="pipeline-paper-hero">
        <div className="site-container pipeline-paper-hero-inner">
          <nav className="pipeline-breadcrumbs" aria-label="Breadcrumb">
            <a href={toAppPath("/")}>Home</a>
            <span>/</span>
            <span>Pipeline</span>
          </nav>

          <div className="pipeline-paper-kicker">
            <span>LoopsBench paper · Section 2</span>
            <a href={paperUrl} target="_blank" rel="noreferrer">
              Read the paper <span aria-hidden="true">↗</span>
            </a>
          </div>

          <h1>
            From source evidence
            {" "}<span>to executable obligations.</span>
          </h1>
          <p className="pipeline-paper-deck">
            LoopsBench turns authentic development histories into dependency-structured evaluation
            instances. The graph controls test release, completed work remains live as regression
            obligations, and every run records how the coding loop plans, routes, verifies, and retains state.
          </p>

          <nav className="pipeline-phase-index" aria-label="Pipeline phases">
            {pipelinePhases.map((phase) => (
              <a href={`#${phase.anchor}`} key={phase.anchor}>
                <span>{phase.index}</span>
                <strong>{phase.label}</strong>
                <small>{phase.detail}</small>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section className="pipeline-paper-band pipeline-provenance" id="provenance">
        <div className="site-container">
          <header className="pipeline-section-heading">
            <span className="pipeline-section-number">01</span>
            <div>
              <p>Native provenance</p>
              <h2>Three sources. One evaluation contract.</h2>
            </div>
          </header>
          <p className="pipeline-section-lede">
            We collect authentic developer, educator, and researcher artifacts to vary routing burden and
            obligation-retention pressure while preserving auditable prerequisite evidence.
          </p>

          <div className="pipeline-source-grid">
            {sourceStreams.map((source) => (
              <article className="pipeline-source" data-tone={source.tone} key={source.title}>
                <div className="pipeline-source-topline">
                  <span>{source.index}</span>
                  <small>{source.provenance}</small>
                </div>
                <h3>{source.title}</h3>
                <p>{source.body}</p>
                <div className="pipeline-source-yield" aria-label={`${source.candidates} candidates become ${source.released} released tasks`}>
                  <div>
                    <strong>{source.candidates}</strong>
                    <span>candidates</span>
                  </div>
                  <i aria-hidden="true">→</i>
                  <div>
                    <strong>{source.released}</strong>
                    <span>released</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pipeline-paper-band pipeline-construction" id="construction">
        <div className="site-container">
          <header className="pipeline-section-heading">
            <span className="pipeline-section-number">02</span>
            <div>
              <p>Task construction</p>
              <h2>Five stages preserve provenance all the way to the test runner.</h2>
            </div>
          </header>
          <p className="pipeline-section-lede">
            Heterogeneous source artifacts are normalized into atomic candidates, filtered for observable
            long-horizon pressure, decomposed into development units, and materialized as self-contained
            evaluation instances.
          </p>

          <div className="pipeline-stage-track" aria-label="Five task-construction stages">
            {constructionStages.map((stage) => (
              <article className="pipeline-stage" key={stage.index}>
                <div className="pipeline-stage-index">
                  <span>{stage.index}</span>
                  <i aria-hidden="true" />
                </div>
                <h3>{stage.title}</h3>
                <p>{stage.detail}</p>
                <small>{stage.output}</small>
              </article>
            ))}
          </div>

          <div className="pipeline-thresholds">
            <div>
              <span>Selection threshold</span>
              <strong>≥ 2.5 months</strong>
              <small>temporal span</small>
            </div>
            <div>
              <span>Selection threshold</span>
              <strong>≥ 1,200</strong>
              <small>source-specific solution scale</small>
            </div>
            <p>
              Both thresholds are source-agnostic. After filtering, <strong>112 tasks</strong> remain in the
              released loop-engineering evaluation suite.
            </p>
          </div>

          <div className="pipeline-unit-definition">
            <div className="pipeline-unit-formula" aria-label="A development unit equals requirement, scope, prerequisites, reference patch, and tests">
              <span>u</span>
              <i>=</i>
              <strong>( r<sub>u</sub>, s<sub>u</sub>, p<sub>u</sub>, Δ<sub>u</sub>, T<sub>u</sub> )</strong>
            </div>
            <div className="pipeline-unit-fields">
              {unitFields.map(([symbol, label]) => (
                <div key={symbol}>
                  <strong>{symbol}<sub>u</sub></strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pipeline-dag-layout">
            <div className="pipeline-dag-copy">
              <p className="pipeline-mini-label">Intra-task relation recovery</p>
              <h3>Only source-evidenced edges enter the graph.</h3>
              <p>
                Every node is a separately testable acceptance unit. Edges encode prerequisite structure,
                establishing the ready frontier and the obligations that must stay satisfied as later work begins.
              </p>
              <div className="pipeline-relation-list">
                {relationSignals.map((signal) => (
                  <div key={signal.index}>
                    <span>{signal.index}</span>
                    <p><strong>{signal.title}</strong>{signal.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <figure className="pipeline-dag-figure">
              <div className="pipeline-dag-canvas" aria-label="Example development-unit dependency graph">
                <svg viewBox="0 0 760 300" aria-hidden="true">
                  <path d="M85 150 C145 150 150 70 205 70" />
                  <path d="M85 150 C145 150 150 230 205 230" />
                  <path d="M245 70 C315 70 315 150 385 150" />
                  <path d="M245 230 C315 230 315 150 385 150" />
                  <path d="M425 150 L545 150" />
                  <path d="M585 150 C640 150 645 70 695 70" />
                  <path d="M585 150 C640 150 645 230 695 230" />
                </svg>
                {dagNodes.map(([className, unit, label]) => (
                  <span className={`pipeline-dag-node pipeline-dag-node-${className}`} key={unit}>
                    <strong>{unit}</strong>
                    <small>{label}</small>
                  </span>
                ))}
              </div>
              <figcaption>
                A valid loop may choose any topological order; the recovered DAG is an evaluation contract,
                not a prescribed implementation path.
              </figcaption>
            </figure>
          </div>

          <div className="pipeline-instrumentation">
            <div className="pipeline-instrumentation-heading">
              <p className="pipeline-mini-label">Task instrumentation</p>
              <h3>Make every obligation executable.</h3>
            </div>
            <div className="pipeline-instrumentation-grid">
              {instrumentationTracks.map((track) => (
                <article key={track.index}>
                  <span>{track.index}</span>
                  <h4>{track.title}</h4>
                  <p>{track.body}</p>
                  <small>{track.output}</small>
                </article>
              ))}
            </div>
            <div className="pipeline-validation">
              <p>Every unit test must pass all three fail-to-pass trials</p>
              <div>
                {validationTrials.map((trial) => (
                  <article key={trial.title}>
                    <span aria-hidden="true">✓</span>
                    <p><strong>{trial.title}</strong>{trial.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pipeline-paper-band pipeline-evaluation" id="evaluation">
        <div className="site-container">
          <header className="pipeline-section-heading">
            <span className="pipeline-section-number">03</span>
            <div>
              <p>Flow-aware evaluation</p>
              <h2>The constructed graph becomes a live scoring contract.</h2>
            </div>
          </header>
          <p className="pipeline-section-lede">
            Tests are released layer by layer along the dependency DAG. Once a unit clears its gate, its
            tests remain active on every later layer, exposing regressions without telling the evaluated loop
            which obligation is currently ready.
          </p>

          <div className="pipeline-runtime" aria-label="Dual-container snapshot evaluation">
            <article className="pipeline-runtime-station">
              <span>Container A</span>
              <h3>Working tree</h3>
              <p>The coding loop's sole write target. Editing continues while evaluation runs independently.</p>
              <small>edit · plan · test</small>
            </article>
            <div className="pipeline-snapshot-stream" aria-hidden="true">
              <span>snapshot</span>
              <div><i /><i /><i /><i /></div>
              <small>periodic diff queue</small>
            </div>
            <article className="pipeline-runtime-station pipeline-runtime-station-test">
              <span>Container B</span>
              <h3>Harness runner</h3>
              <p>Runs the released layer against monotonic snapshots in the reference environment.</p>
              <small>verify · release · retain</small>
            </article>
          </div>

          <div className="pipeline-obligation-track">
            <div className="pipeline-frontier-row">
              <span>ready frontier</span>
              <i data-state="passed" /><i data-state="passed" /><i data-state="active" />
              <i /><i /><i />
            </div>
            <div className="pipeline-frontier-row">
              <span>regression obligations</span>
              <i data-state="retained" /><i data-state="retained" /><i data-state="watch" />
              <i data-state="future" /><i data-state="future" /><i data-state="future" />
            </div>
          </div>

          <footer className="pipeline-paper-cta">
            <p>
              <span>112 tasks</span>
              More than 5,300 development units, each grounded in source evidence and bound to executable tests.
            </p>
            <div>
              <a href={toAppPath("/benchmarks")}>Explore benchmarks <span aria-hidden="true">↗</span></a>
              <a href={paperUrl} target="_blank" rel="noreferrer">Read Section 2 <span aria-hidden="true">↗</span></a>
            </div>
          </footer>
        </div>
      </section>
    </article>
  );
}
