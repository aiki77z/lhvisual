import { FormEvent, useState } from "react";
import type { SubmissionFormInput } from "../../types/submission";

type SubmissionFormProps = {
  submitting: boolean;
  error: string | null;
  onSubmit(input: SubmissionFormInput): Promise<void>;
};

type FormState = {
  taskId: string;
  authorName: string;
  authorEmail: string;
  sourceRepoUrl: string;
  sourceCommitSha: string;
  summary: string;
  declarationAccepted: boolean;
  website: string;
  archive: File | null;
};

const initialState: FormState = {
  taskId: "",
  authorName: "",
  authorEmail: "",
  sourceRepoUrl: "",
  sourceCommitSha: "",
  summary: "",
  declarationAccepted: false,
  website: "",
  archive: null,
};

export function SubmissionForm({ submitting, error, onSubmit }: SubmissionFormProps) {
  const [state, setState] = useState<FormState>(initialState);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.archive) {
      setLocalError("Please attach a `.zip`, `.tar.gz`, or `.tgz` task bundle.");
      return;
    }
    if (!state.taskId.trim().startsWith("task_")) {
      setLocalError("`task_id` must start with `task_` and match the archive top-level directory.");
      return;
    }
    setLocalError(null);
    await onSubmit({
      taskId: state.taskId.trim(),
      authorName: state.authorName.trim(),
      authorEmail: state.authorEmail.trim(),
      sourceRepoUrl: state.sourceRepoUrl.trim(),
      sourceCommitSha: state.sourceCommitSha.trim(),
      summary: state.summary.trim(),
      declarationAccepted: state.declarationAccepted,
      archive: state.archive,
    });
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
      <label>
        <span>Task ID</span>
        <input
          required
          type="text"
          value={state.taskId}
          onChange={(event) => setState((current) => ({ ...current, taskId: event.target.value }))}
          placeholder="task_my_new_benchmark_case"
        />
      </label>

      <div className="submission-grid-two">
        <label>
          <span>Author name</span>
          <input
            required
            type="text"
            value={state.authorName}
            onChange={(event) => setState((current) => ({ ...current, authorName: event.target.value }))}
          />
        </label>
        <label>
          <span>Author email</span>
          <input
            required
            type="email"
            value={state.authorEmail}
            onChange={(event) => setState((current) => ({ ...current, authorEmail: event.target.value }))}
          />
        </label>
      </div>

      <label className="submission-honeypot" aria-hidden="true">
        <span>Website</span>
        <input
          tabIndex={-1}
          autoComplete="off"
          type="text"
          value={state.website}
          onChange={(event) => setState((current) => ({ ...current, website: event.target.value }))}
        />
      </label>

      <label>
        <span>Source repository URL</span>
        <input
          required
          type="url"
          value={state.sourceRepoUrl}
          onChange={(event) => setState((current) => ({ ...current, sourceRepoUrl: event.target.value }))}
          placeholder="https://github.com/your-org/your-source-repo"
        />
      </label>

      <label>
        <span>Source commit SHA</span>
        <input
          required
          type="text"
          value={state.sourceCommitSha}
          onChange={(event) => setState((current) => ({ ...current, sourceCommitSha: event.target.value }))}
          placeholder="abc1234"
        />
      </label>

      <label>
        <span>Submission summary</span>
        <textarea
          required
          rows={5}
          value={state.summary}
          onChange={(event) => setState((current) => ({ ...current, summary: event.target.value }))}
          placeholder="What does this task cover, and what evidence should reviewers look at?"
        />
      </label>

      <label>
        <span>Task bundle archive</span>
        <input
          required
          type="file"
          accept=".zip,.tar.gz,.tgz"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              archive: event.target.files?.[0] ?? null,
            }))
          }
        />
        <small>Accepted formats: `.zip`, `.tar.gz`, `.tgz`. Top level must be a single `task_&lt;slug&gt;/` directory.</small>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={state.declarationAccepted}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              declarationAccepted: event.target.checked,
            }))
          }
          required
        />
        <span>I confirm I have the right to submit this task and understand that successful submissions may become a public PR.</span>
      </label>

      {(localError || error) && <p className="submission-error">{localError || error}</p>}

      <button className="submit-button" disabled={submitting} type="submit">
        {submitting ? "Submitting..." : "Submit task"}
      </button>
    </form>
  );
}
