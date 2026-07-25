import { contributionCommands, contributionFaq, contributionLinks, contributionProcess, reviewPipeline, taskCriteria, taskStructureExample } from "../../data/contribution";
import { toAppPath } from "../../lib/site";
import { CopyableCodeBlock } from "../shared/CopyableCodeBlock";
import { ExternalLinkIcon } from "../shared/ExternalLinkIcon";

export function SubmitTaskPage() {
  const proposalReady = Boolean(contributionLinks.proposalUrl);
  const guideReady = Boolean(contributionLinks.guideUrl);

  return (
    <div className="benchmark-detail-page contribution-page">
      <div className="benchmark-detail-inner">
        <nav className="registry-breadcrumbs" aria-label="Breadcrumb">
          <a href={toAppPath("/")}>Home</a>
          <span>&gt;</span>
          <span>Submit Task</span>
        </nav>

        <header className="registry-detail-hero contribution-hero">
          <p className="registry-detail-task-id">GitHub-native workflow</p>
          <h1 className="registry-detail-title">Submit a Task</h1>
          <p className="registry-detail-summary">
            Contribute a source-grounded, separately testable, long-horizon software development task to LoopsBench.
          </p>
          <div className="contribution-action-row">
            <a
              className={`contribution-action-link${proposalReady ? "" : " contribution-action-link-disabled"}`}
              href={proposalReady ? contributionLinks.proposalUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!proposalReady}
            >
              <span>Submit a Proposal</span>
              <ExternalLinkIcon />
            </a>
            <a
              className={`contribution-action-link contribution-action-link-secondary${guideReady ? "" : " contribution-action-link-disabled"}`}
              href={guideReady ? contributionLinks.guideUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!guideReady}
            >
              <span>Read Contribution Guide</span>
              <ExternalLinkIcon />
            </a>
          </div>
          <p className="registry-detail-note">
            Proposal issues capture the task design. The finished task itself is submitted later through a GitHub Pull
            Request after local validation passes. Proposal approval means the task idea is worth building, but it does
            not guarantee the final task will merge.
          </p>
        </header>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Contribution Process</h2>
          <div className="contribution-step-list">
            {contributionProcess.map((step) => (
              <article className="contribution-step" key={step.number}>
                <p className="contribution-step-number">{step.number}</p>
                <div>
                  <h3 className="registry-subsection-title">{step.title}</h3>
                  <p className="registry-detail-note contribution-step-note">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">What Makes a Good LoopsBench Task</h2>
          <div className="contribution-criteria-grid">
            {taskCriteria.map((criterion) => (
              <article className="registry-info-box contribution-criterion-card" key={criterion.title}>
                <h3 className="registry-subsection-title">{criterion.title}</h3>
                <p className="registry-detail-note contribution-criterion-note">{criterion.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Task Structure</h2>
          <p className="registry-detail-note">
            This layout matches the checked-in task template and the structure used by existing multi-unit tasks such as
            the TCP transport benchmark.
          </p>
          <div className="contribution-link-row">
            <a className="registry-card-link" href={contributionLinks.templateUrl} target="_blank" rel="noopener noreferrer">
              Template
            </a>
            <a className="registry-card-link" href={contributionLinks.exampleTaskUrl} target="_blank" rel="noopener noreferrer">
              Example task
            </a>
            <a className="registry-card-link" href={toAppPath("/benchmarks")}>
              Existing benchmarks
            </a>
          </div>
          <pre className="registry-command-block contribution-structure-block">{taskStructureExample}</pre>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Local Validation</h2>
          <div className="contribution-command-grid">
            {contributionCommands.map((entry) => (
              <CopyableCodeBlock key={entry.label} code={entry.code} label={entry.label} note={entry.note} />
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Review Pipeline</h2>
          <div className="contribution-pipeline" aria-label="Task contribution review pipeline">
            {reviewPipeline.map((step, index) => (
              <div className="contribution-pipeline-step" key={step}>
                <span>{step}</span>
                {index < reviewPipeline.length - 1 ? <i aria-hidden="true">&gt;</i> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">FAQ</h2>
          <div className="contribution-faq-list">
            {contributionFaq.map((item) => (
              <article className="registry-info-box contribution-faq-card" key={item.question}>
                <h3 className="registry-subsection-title">{item.question}</h3>
                <p className="registry-detail-note contribution-faq-note">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
