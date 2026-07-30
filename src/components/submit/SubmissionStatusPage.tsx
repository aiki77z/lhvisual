import { contributionLinks } from "../../data/contribution";
import { toAppPath } from "../../lib/site";
import { ExternalLinkIcon } from "../shared/ExternalLinkIcon";

export function SubmissionStatusPage() {
  return (
    <div className="benchmark-detail-page contribution-page">
      <div className="benchmark-detail-inner">
        <nav className="registry-breadcrumbs" aria-label="Breadcrumb">
          <a href={toAppPath("/")}>Home</a>
          <span>&gt;</span>
          <a href={toAppPath("/submit-task")}>Submit Task</a>
          <span>&gt;</span>
          <span>Track on GitHub</span>
        </nav>

        <header className="registry-detail-hero contribution-hero">
          <p className="registry-detail-task-id">GitHub review flow</p>
          <h1 className="registry-detail-title">Track a Task on GitHub</h1>
          <p className="registry-detail-summary">
            Task contribution progress now lives in GitHub issues and pull requests rather than a website submission
            ID.
          </p>
          <div className="contribution-action-row">
            <a
              className="contribution-action-link"
              href={contributionLinks.proposalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Open Proposal Form</span>
              <ExternalLinkIcon />
            </a>
            <a
              className="contribution-action-link contribution-action-link-secondary"
              href={contributionLinks.guideUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Open Contribution Guide</span>
              <ExternalLinkIcon />
            </a>
          </div>
        </header>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Where to look</h2>
          <div className="contribution-faq-list">
            <article className="registry-info-box contribution-faq-card">
              <h3 className="registry-subsection-title">Proposal issue</h3>
              <p className="registry-detail-note contribution-faq-note">
                Review the task design, provenance, dependency evidence, and maintainer approval state on the Proposal
                issue.
              </p>
            </article>
            <article className="registry-info-box contribution-faq-card">
              <h3 className="registry-subsection-title">Task pull request</h3>
              <p className="registry-detail-note contribution-faq-note">
                Track the final task files, CI results, review comments, and merge state in the corresponding GitHub
                Pull Request.
              </p>
            </article>
          </div>
          <p className="registry-detail-note">
            Start from the
            {" "}
            <a className="text-link" href={toAppPath("/submit-task")}>
              Submit Task
            </a>
            {" "}
            page if you need the complete contribution workflow.
          </p>
        </section>
      </div>
    </div>
  );
}
