export type SubmissionStatus =
  | "received"
  | "stored"
  | "queued"
  | "preflight_running"
  | "preflight_failed"
  | "repo_prepare_running"
  | "repo_prepare_failed"
  | "oracle_running"
  | "oracle_failed"
  | "pr_opening"
  | "pr_open_failed"
  | "completed";

export type SubmissionEvent = {
  status: SubmissionStatus;
  message: string;
  created_at: string;
};

export type SubmissionLog = {
  name: string;
  download_path: string;
};

export type SubmissionRecord = {
  id: string;
  task_id: string;
  status: SubmissionStatus;
  author_name: string;
  author_email: string;
  source_repo_url: string;
  source_commit_sha: string;
  summary: string;
  pr_number: number | null;
  pr_url: string | null;
  pr_branch: string | null;
  oracle_run_id: string | null;
  oracle_results_path: string | null;
  oracle_is_resolved: boolean | null;
  error_code: string | null;
  error_summary: string | null;
  submitted_at: string;
  updated_at: string;
  events: SubmissionEvent[];
  logs: SubmissionLog[];
};

export type SubmissionCreateResponse = {
  id: string;
  task_id: string;
  status: SubmissionStatus;
  status_url: string;
};

export type SubmissionFormInput = {
  taskId: string;
  authorName: string;
  authorEmail: string;
  sourceRepoUrl: string;
  sourceCommitSha: string;
  summary: string;
  declarationAccepted: boolean;
  archive: File;
};

export const terminalSubmissionStatuses = new Set<SubmissionStatus>([
  "preflight_failed",
  "repo_prepare_failed",
  "oracle_failed",
  "pr_open_failed",
  "completed",
]);
