from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubmissionEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    message: str
    created_at: datetime


class SubmissionLogRead(BaseModel):
    name: str
    download_path: str


class SubmissionCreateResponse(BaseModel):
    id: str
    task_id: str
    status: str
    status_url: str


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    status: str
    author_name: str
    author_email: str
    source_repo_url: str
    source_commit_sha: str
    summary: str
    pr_number: int | None
    pr_url: str | None
    pr_branch: str | None
    oracle_run_id: str | None
    oracle_results_path: str | None
    oracle_is_resolved: bool | None
    error_code: str | None
    error_summary: str | None
    submitted_at: datetime
    updated_at: datetime
    events: list[SubmissionEventRead]
    logs: list[SubmissionLogRead]


class LogsIndexResponse(BaseModel):
    id: str
    logs: list[SubmissionLogRead]


class HealthResponse(BaseModel):
    status: str
    process_inline: bool
    queue_name: str
