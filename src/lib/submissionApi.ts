import type {
  SubmissionCreateResponse,
  SubmissionFormInput,
  SubmissionRecord,
} from "../types/submission";

const configuredApiBase = (import.meta.env.VITE_SUBMISSION_API_BASE || "").replace(/\/$/, "");

function getHostedApiFallback() {
  if (typeof window === "undefined") {
    return "";
  }
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "loopsbench.ai" || hostname === "www.loopsbench.ai") {
    return "https://api.loopsbench.ai";
  }
  return "";
}

const apiBase = (configuredApiBase || getHostedApiFallback()).replace(/\/$/, "");

function apiUrl(path: string) {
  if (apiBase) {
    return `${apiBase}${path}`;
  }
  return path;
}

async function parseError(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
  } catch {
    // fall through
  }
  return `${response.status} ${response.statusText}`;
}

export async function createSubmission(input: SubmissionFormInput) {
  const body = new FormData();
  body.set("task_id", input.taskId);
  body.set("author_name", input.authorName);
  body.set("author_email", input.authorEmail);
  body.set("source_repo_url", input.sourceRepoUrl);
  body.set("source_commit_sha", input.sourceCommitSha);
  body.set("summary", input.summary);
  body.set("declaration_accepted", input.declarationAccepted ? "true" : "false");
  body.set("website", "");
  body.set("archive", input.archive);

  const response = await fetch(apiUrl("/api/v1/submissions"), {
    body,
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as SubmissionCreateResponse;
}

export async function getSubmission(submissionId: string) {
  const response = await fetch(apiUrl(`/api/v1/submissions/${encodeURIComponent(submissionId)}`));
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as SubmissionRecord;
}
