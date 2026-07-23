import { useEffect, useState } from "react";
import { buildGitHubLoginUrl, createSubmission, getGitHubSession, logoutGitHubSession } from "../../lib/submissionApi";
import { toAppPath } from "../../lib/site";
import type { GitHubSessionState, SubmissionFormInput } from "../../types/submission";
import { SubmissionForm } from "./SubmissionForm";

export function SubmitTaskPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubSession, setGithubSession] = useState<GitHubSessionState | null>(null);
  const [githubSessionLoading, setGithubSessionLoading] = useState(true);
  const [githubActionBusy, setGithubActionBusy] = useState(false);

  async function refreshGitHubSession() {
    try {
      const session = await getGitHubSession();
      setGithubSession(session);
      setGithubError(null);
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to load GitHub session.");
    } finally {
      setGithubSessionLoading(false);
      setGithubActionBusy(false);
    }
  }

  useEffect(() => {
    void refreshGitHubSession();
  }, []);

  useEffect(() => {
    const expectedOrigin = (() => {
      try {
        return new URL(buildGitHubLoginUrl(window.location.href)).origin;
      } catch {
        return window.location.origin;
      }
    })();

    function handleMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) {
        return;
      }
      const payload = event.data;
      if (!payload || typeof payload !== "object" || payload.type !== "loopsbench:github-auth-result") {
        return;
      }
      if (payload.ok) {
        setGithubError(null);
      } else {
        setGithubError(typeof payload.error === "string" ? payload.error : "GitHub connection failed.");
      }
      void refreshGitHubSession();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleConnectGitHub() {
    setGithubActionBusy(true);
    setGithubError(null);
    const popup = window.open(
      buildGitHubLoginUrl(window.location.href),
      "loopsbench-github-auth",
      "popup=yes,width=720,height=820",
    );
    if (!popup) {
      setGithubActionBusy(false);
      setGithubError("The GitHub login popup was blocked by the browser.");
    }
  }

  async function handleDisconnectGitHub() {
    setGithubActionBusy(true);
    try {
      const session = await logoutGitHubSession();
      setGithubSession(session);
      setGithubError(null);
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to disconnect GitHub.");
    } finally {
      setGithubActionBusy(false);
    }
  }

  async function handleSubmit(input: SubmissionFormInput) {
    setSubmitting(true);
    setError(null);
    if (!githubSession?.authenticated) {
      setSubmitting(false);
      setGithubError("Connect GitHub before submitting a task.");
      return;
    }
    try {
      const created = await createSubmission(input);
      window.location.href = toAppPath(`/submit-task/status?id=${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-container submit-page">
      <section className="submit-hero">
        <p className="eyebrow">Task intake</p>
        <h1>Submit a LoopsBench task</h1>
        <p className="submit-lede">
          Upload a complete task bundle for backend validation. The service performs
          archive preflight checks, clones the target repository, runs Oracle, and
          opens a Draft PR from your connected GitHub account only if the task resolves successfully.
        </p>
      </section>

      <div className="submit-layout">
        <div className="submit-panel">
          <h2>Submission form</h2>
          <SubmissionForm
            error={error}
            githubActionBusy={githubActionBusy}
            githubError={githubError}
            githubSession={githubSession}
            githubSessionLoading={githubSessionLoading}
            onConnectGitHub={handleConnectGitHub}
            onDisconnectGitHub={handleDisconnectGitHub}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>

        <aside className="submit-sidebar">
          <section className="submit-panel">
            <h2>Bundle requirements</h2>
            <ul className="submit-checklist">
              <li>Archive expands to one top-level `task_&lt;slug&gt;/` directory.</li>
              <li>`task.yaml`, `Dockerfile`, `docker-compose.yaml`, `solution.sh`, `run-tests.sh`, and `tests/` are all present.</li>
              <li>`task.yaml.task_name` matches the submitted `task_id` exactly.</li>
              <li>The backend will run `lhb tasks validate` and then Oracle before any PR is opened.</li>
            </ul>
          </section>

          <section className="submit-panel">
            <h2>What happens next</h2>
            <ol className="submit-checklist ordered">
              <li>Your archive is stored and assigned a `submission_id`.</li>
              <li>Preflight checks verify archive safety and task structure.</li>
              <li>The backend clones `microsoft/Loopsbench`, installs the task under `tasks/&lt;task_id&gt;`, and runs Oracle.</li>
              <li>If Oracle passes, the service forks and creates a Draft PR from your connected GitHub account, then links it from the status page.</li>
            </ol>
            <a className="btn btn-primary" href={toAppPath("/submit-task/status")}>
              Open status page
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
