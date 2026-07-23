import { useEffect, useState } from "react";
import { getSubmission } from "../../lib/submissionApi";
import { toAppPath } from "../../lib/site";
import type { SubmissionRecord } from "../../types/submission";
import { terminalSubmissionStatuses } from "../../types/submission";
import { SubmissionTimeline } from "./SubmissionTimeline";

function currentSubmissionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() || "";
}

export function SubmissionStatusPage() {
  const [submissionId] = useState(currentSubmissionId);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function refresh() {
      try {
        const next = await getSubmission(submissionId);
        if (cancelled) {
          return;
        }
        setSubmission(next);
        setError(null);
        setLoading(false);
        if (!terminalSubmissionStatuses.has(next.status)) {
          timer = window.setTimeout(refresh, 5000);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load submission.");
        setLoading(false);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [submissionId]);

  if (!submissionId) {
    return (
      <section className="article-shell">
        <p className="eyebrow">Submission status</p>
        <h1>Find a submission</h1>
        <p className="submit-muted">
          Add `?id=&lt;submission_id&gt;` to the URL, or start from the submit page.
        </p>
        <p>
          <a className="text-link" href={toAppPath("/submit-task")}>
            Submit a task
          </a>
        </p>
      </section>
    );
  }

  return (
    <div className="site-container submit-page">
      <section className="submit-hero">
        <p className="eyebrow">Submission status</p>
        <h1>{submission?.task_id || submissionId}</h1>
        <p className="submit-lede">
          Track backend preflight, Oracle execution, and PR creation for this submission.
        </p>
      </section>

      <div className="submit-layout">
        <div className="submit-panel">
          <div className="status-head">
            <div>
              <p className="submit-kicker">Submission ID</p>
              <code>{submissionId}</code>
            </div>
            <div>
              <p className="submit-kicker">Current status</p>
              <strong>{submission?.status.replace(/_/g, " ") || (loading ? "loading" : "unknown")}</strong>
            </div>
          </div>

          {loading && <p className="submit-muted">Loading submission state...</p>}
          {error && <p className="submission-error">{error}</p>}

          {submission && (
            <>
              <div className="status-summary-grid">
                <div>
                  <span>Author</span>
                  <strong>{submission.author_name}</strong>
                </div>
                <div>
                  <span>GitHub</span>
                  <strong>{submission.github_login ? `@${submission.github_login}` : "not linked"}</strong>
                </div>
                <div>
                  <span>Oracle</span>
                  <strong>{submission.oracle_is_resolved ? "passed" : "pending / failed"}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{new Date(submission.updated_at).toLocaleString()}</strong>
                </div>
              </div>

              {submission.pr_url && (
                <p className="submission-success">
                  Draft PR:
                  {" "}
                  <a className="text-link" href={submission.pr_url}>
                    {submission.pr_url}
                  </a>
                </p>
              )}

              {submission.error_summary && (
                <p className="submission-error">
                  {submission.error_code ? `${submission.error_code}: ` : ""}
                  {submission.error_summary}
                </p>
              )}

              <section className="submission-section">
                <h2>Timeline</h2>
                <SubmissionTimeline events={submission.events} />
              </section>

              <section className="submission-section">
                <h2>Artifacts</h2>
                {submission.logs.length ? (
                  <ul className="artifact-list">
                    {submission.logs.map((log) => (
                      <li key={log.name}>
                        <a className="text-link" href={log.download_path}>
                          {log.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="submit-muted">No logs have been written yet.</p>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="submit-sidebar">
          <section className="submit-panel">
            <h2>Need another submission?</h2>
            <p className="submit-muted">
              Every task gets its own `submission_id`. Keep that id if you want to
              revisit logs or PR links later.
            </p>
            <a className="btn btn-primary" href={toAppPath("/submit-task")}>
              Submit another task
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
