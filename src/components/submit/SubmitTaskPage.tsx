import { useState } from "react";
import { createSubmission } from "../../lib/submissionApi";
import { toAppPath } from "../../lib/site";
import type { SubmissionFormInput } from "../../types/submission";
import { SubmissionForm } from "./SubmissionForm";

export function SubmitTaskPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: SubmissionFormInput) {
    setSubmitting(true);
    setError(null);
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
          opens a Draft PR only if the task resolves successfully.
        </p>
      </section>

      <div className="submit-layout">
        <div className="submit-panel">
          <h2>Submission form</h2>
          <SubmissionForm error={error} onSubmit={handleSubmit} submitting={submitting} />
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
              <li>If Oracle passes, the service creates a Draft PR and links it from the status page.</li>
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
