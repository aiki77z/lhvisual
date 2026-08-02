import {
  pipelineFacts,
  pipelineFlowStages,
  pipelineReleaseNote,
} from "../../data/pipeline";
import { toAppPath } from "../../lib/site";

export function PipelinePage() {
  return (
    <div className="benchmark-detail-page">
      <div className="benchmark-detail-inner">
        <nav className="registry-breadcrumbs" aria-label="Breadcrumb">
          <a href={toAppPath("/")}>Home</a>
          <span>&gt;</span>
          <span>Pipeline</span>
        </nav>

        <header className="registry-detail-hero contribution-hero">
          <p className="registry-detail-task-id">Open-source task construction</p>
          <h1 className="registry-detail-title">Open-Source Task Pipeline</h1>
          <p className="registry-detail-summary">
            A compact view of how we turn real open-source repository histories
            into source-grounded LoopsBench tasks.
          </p>
          <div className="contribution-action-row">
            <a className="contribution-action-link" href="#pipeline-release">
              Get our pipeline
            </a>
          </div>
          <p className="registry-detail-note">
            The flow below shows the construction path from repository evidence
            to a runnable benchmark task.
          </p>
        </header>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Overview</h2>
          <div className="registry-fact-grid">
            {pipelineFacts.map((fact) => (
              <article className="registry-fact" key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
                <span>{fact.detail}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Pipeline flow</h2>
          <p className="registry-detail-note">
            A shortened view from repository evidence to a released task
            directory.
          </p>
          <div className="pipeline-flow-list" aria-label="Open-source task construction flow">
            {pipelineFlowStages.map((stage, index) => (
              <article className="pipeline-flow-step" key={stage.title}>
                <div className="pipeline-flow-rail" aria-hidden="true">
                  <span className="pipeline-flow-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < pipelineFlowStages.length - 1 ? (
                    <i className="pipeline-flow-line" />
                  ) : null}
                </div>
                <div className="pipeline-flow-card">
                  <div className="pipeline-flow-card-head">
                    <h3 className="registry-subsection-title">{stage.title}</h3>
                    <span className="registry-detail-task-id">Stage {index + 1}</span>
                  </div>
                  <p className="registry-detail-note">{stage.detail}</p>
                  <div className="registry-card-meta pipeline-flow-artifacts">
                    {stage.outputs.map((output) => (
                      <span className="registry-badge" key={output}>
                        {output}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="pipeline-flow-more" aria-hidden="true">
            ...
          </div>
        </section>

        <section className="registry-detail-section pipeline-release-section" id="pipeline-release">
          <div className="pipeline-release-card">
            <div className="pipeline-release-row">
              <h2 className="registry-detail-heading">Code release</h2>
              <span className="pipeline-release-pill">{pipelineReleaseNote}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
