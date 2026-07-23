import { FormEvent, useEffect, useRef, useState } from "react";
import type { GitHubSessionState, SubmissionFormInput } from "../../types/submission";

type SubmissionFormProps = {
  submitting: boolean;
  error: string | null;
  githubError: string | null;
  githubSession: GitHubSessionState | null;
  githubSessionLoading: boolean;
  githubActionBusy: boolean;
  onConnectGitHub(): void;
  onDisconnectGitHub(): Promise<void>;
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

export function SubmissionForm({
  submitting,
  error,
  githubError,
  githubSession,
  githubSessionLoading,
  githubActionBusy,
  onConnectGitHub,
  onDisconnectGitHub,
  onSubmit,
}: SubmissionFormProps) {
  const [state, setState] = useState<FormState>(initialState);
  const [localError, setLocalError] = useState<string | null>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const githubUser = githubSession?.authenticated ? githubSession.user : null;
  const isGitHubConnected = githubUser !== null;

  useEffect(() => {
    if (!githubUser) {
      return;
    }
    setState((current) => ({
      ...current,
      authorName: current.authorName || githubUser.name || githubUser.login,
      authorEmail: current.authorEmail || githubUser.email || current.authorEmail,
    }));
  }, [githubUser]);

  const isFormComplete =
    isGitHubConnected &&
    state.taskId.trim().length > 0 &&
    state.authorName.trim().length > 0 &&
    state.authorEmail.trim().length > 0 &&
    state.sourceRepoUrl.trim().length > 0 &&
    state.sourceCommitSha.trim().length > 0 &&
    state.summary.trim().length > 0 &&
    state.declarationAccepted &&
    state.archive !== null;

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
      <section className="github-auth-card">
        <div className="github-auth-card-head">
          <div>
            <span>GitHub account</span>
            {githubSessionLoading ? (
              <p className="submit-muted">Checking GitHub session...</p>
            ) : isGitHubConnected ? (
              <p className="submit-muted">
                Connected as
                {" "}
                <strong>@{githubUser.login}</strong>
                . If Oracle passes, the backend will fork and open the PR from this account.
              </p>
            ) : (
              <p className="submit-muted">
                Connect GitHub before submitting. The final PR will be opened from your own account, not from the LoopsBench server.
              </p>
            )}
          </div>
          {isGitHubConnected ? (
            <button
              className="github-auth-button secondary"
              disabled={githubActionBusy || submitting}
              type="button"
              onClick={() => {
                void onDisconnectGitHub();
              }}
            >
              {githubActionBusy ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <button
              className="github-auth-button"
              disabled={githubActionBusy || githubSessionLoading || submitting}
              type="button"
              onClick={onConnectGitHub}
            >
              {githubActionBusy ? "Connecting..." : "Connect GitHub"}
            </button>
          )}
        </div>
        {githubUser && (
          <div className="github-auth-meta">
            <span>@{githubUser.login}</span>
            {githubUser.email && <span>{githubUser.email}</span>}
            {githubUser.scopes.length > 0 && <span>{githubUser.scopes.join(", ")}</span>}
          </div>
        )}
      </section>

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
        <small>Link to the repository that this task bundle came from, so reviewers can trace its source.</small>
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
        <small>Git commit hash for the exact source snapshot used to prepare this submission.</small>
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
        <small>Short reviewer note describing the task, the intended behavior, and what Oracle should verify.</small>
      </label>

      <label>
        <span>Task bundle archive</span>
        <input
          ref={archiveInputRef}
          className="file-input-native"
          type="file"
          accept=".zip,.tar.gz,.tgz"
          onChange={(event) =>
            setState((current) => ({
              ...current,
              archive: event.target.files?.[0] ?? null,
            }))
          }
        />
        <div className="file-picker">
          <div className="file-picker-row">
            <button className="file-picker-button" type="button" onClick={() => archiveInputRef.current?.click()}>
              Choose file
            </button>
            <span className={`file-picker-name${state.archive ? " has-file" : ""}`} aria-live="polite">
              {state.archive?.name ?? "No file selected"}
            </span>
          </div>
        </div>
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

      {(localError || error || githubError) && <p className="submission-error">{localError || error || githubError}</p>}

      <button className="submit-button" disabled={submitting || !isFormComplete} type="submit">
        {submitting ? "Submitting..." : "Submit task"}
      </button>
    </form>
  );
}
