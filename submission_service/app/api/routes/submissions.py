from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from time import time
from typing import Callable
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from submission_service.app.jobs.process_submission import enqueue_submission_job
from submission_service.app.models import ACTIVE_SUBMISSION_STATUSES, Submission
from submission_service.app.schemas import (
    LogsIndexResponse,
    SubmissionCreateResponse,
    SubmissionEventRead,
    SubmissionLogRead,
    SubmissionRead,
)
from submission_service.app.services.status_events import append_event, mark_error
from submission_service.app.services.storage import (
    StorageError,
    ensure_submission_dirs,
    list_logs,
    store_upload,
    submission_paths,
)

router = APIRouter(prefix="/submissions", tags=["submissions"])


class SimpleRateLimiter:
    def __init__(self, *, max_events: int, window_sec: int):
        self.max_events = max_events
        self.window_sec = window_sec
        self._state: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time()
        bucket = self._state[key]
        while bucket and now - bucket[0] > self.window_sec:
            bucket.popleft()
        if len(bucket) >= self.max_events:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="submission rate limit exceeded for this IP",
            )
        bucket.append(now)


def _build_log_models(submission_id: str, request: Request) -> list[SubmissionLogRead]:
    paths = submission_paths(request.app.state.config, submission_id)
    base_url = str(request.base_url).rstrip("/")
    return [
        SubmissionLogRead(
            name=name,
            download_path=f"{base_url}/api/v1/submissions/{submission_id}/download-log/{name}",
        )
        for name in list_logs(paths)
    ]


def _submission_to_schema(submission: Submission, request: Request) -> SubmissionRead:
    return SubmissionRead(
        id=submission.id,
        task_id=submission.task_id,
        status=submission.status,
        author_name=submission.author_name,
        author_email=submission.author_email,
        source_repo_url=submission.source_repo_url,
        source_commit_sha=submission.source_commit_sha,
        summary=submission.summary,
        pr_number=submission.pr_number,
        pr_url=submission.pr_url,
        pr_branch=submission.pr_branch,
        oracle_run_id=submission.oracle_run_id,
        oracle_results_path=submission.oracle_results_path,
        oracle_is_resolved=submission.oracle_is_resolved,
        error_code=submission.error_code,
        error_summary=submission.error_summary,
        submitted_at=submission.submitted_at,
        updated_at=submission.updated_at,
        events=[SubmissionEventRead.model_validate(event) for event in submission.events],
        logs=_build_log_models(submission.id, request),
    )


def _require_rate_limiter(request: Request) -> SimpleRateLimiter:
    limiter: SimpleRateLimiter | None = getattr(request.app.state, "rate_limiter", None)
    if limiter is None:  # pragma: no cover - defensive
        config = request.app.state.config
        limiter = SimpleRateLimiter(
            max_events=config.max_ip_submissions_per_window,
            window_sec=config.ip_rate_limit_window_sec,
        )
        request.app.state.rate_limiter = limiter
    return limiter


def _enqueue(request: Request, submission_id: str) -> str:
    queue_submission: Callable[[str], str] | None = getattr(request.app.state, "queue_submission_fn", None)
    if queue_submission is not None:
        return queue_submission(submission_id)
    return enqueue_submission_job(submission_id, config=request.app.state.config)


@router.post("", response_model=SubmissionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    request: Request,
    task_id: str = Form(...),
    author_name: str = Form(...),
    author_email: str = Form(...),
    source_repo_url: str = Form(...),
    source_commit_sha: str = Form(...),
    summary: str = Form(...),
    declaration_accepted: bool = Form(...),
    website: str = Form(""),
    archive: UploadFile = File(...),
) -> SubmissionCreateResponse:
    if not declaration_accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="submission declaration must be accepted")
    if website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="submission rejected")
    if archive.filename is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="archive filename is required")
    if not (
        archive.filename.endswith(".zip")
        or archive.filename.endswith(".tar.gz")
        or archive.filename.endswith(".tgz")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="archive must be .zip, .tar.gz, or .tgz",
        )

    config = request.app.state.config
    client_ip = request.client.host if request.client else "unknown"
    _require_rate_limiter(request).check(client_ip)

    submission_id = f"subm_{uuid4().hex[:12]}"
    session_factory = request.app.state.session_factory
    with session_factory() as session:
        window_start = datetime.now(timezone.utc) - timedelta(seconds=config.ip_rate_limit_window_sec)
        recent_by_ip = session.scalar(
            select(func.count()).select_from(Submission).where(
                Submission.ip_address == client_ip,
                Submission.submitted_at >= window_start,
            )
        )
        if recent_by_ip and recent_by_ip >= config.max_ip_submissions_per_window:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="submission rate limit exceeded for this IP",
            )

        active_by_email = session.scalar(
            select(func.count()).select_from(Submission).where(
                Submission.author_email == author_email,
                Submission.status.in_(ACTIVE_SUBMISSION_STATUSES),
            )
        )
        if active_by_email and active_by_email >= config.max_active_submissions_per_email:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="too many active submissions for this email address",
            )

        active_same_task = session.scalar(
            select(func.count()).select_from(Submission).where(
                Submission.task_id == task_id,
                Submission.status.in_(ACTIVE_SUBMISSION_STATUSES),
            )
        )
        if active_same_task and active_same_task > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="another active submission already exists for this task_id",
            )

        submission = Submission(
            id=submission_id,
            task_id=task_id,
            status="received",
            author_name=author_name,
            author_email=author_email,
            source_repo_url=source_repo_url,
            source_commit_sha=source_commit_sha,
            summary=summary,
            declaration_accepted=declaration_accepted,
            ip_address=client_ip,
        )
        append_event(submission, "received", "Submission received by the API.")
        session.add(submission)
        session.commit()

    paths = submission_paths(config, submission_id)
    ensure_submission_dirs(paths)
    with session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is None:  # pragma: no cover - defensive
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="submission disappeared")
        try:
            stored = store_upload(
                archive.file,
                paths.upload_archive,
                filename=archive.filename,
                max_bytes=config.max_upload_bytes,
            )
            submission.archive_filename = stored.filename
            submission.archive_sha256 = stored.sha256
            submission.archive_size_bytes = stored.size_bytes
            submission.artifact_root = str(paths.root)
            append_event(submission, "stored", f"Archive stored at {paths.upload_archive}.")
            session.commit()
        except StorageError as exc:
            mark_error(
                submission,
                status="preflight_failed",
                error_code="upload_storage_failed",
                error_summary=str(exc),
                event_message=f"Upload rejected: {exc}",
            )
            session.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    with session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is not None:
            append_event(submission, "queued", "Submission queued for background processing.")
            session.commit()
    try:
        queue_mode = _enqueue(request, submission_id)
    except Exception as exc:
        with session_factory() as session:
            submission = session.get(Submission, submission_id)
            if submission is not None:
                mark_error(
                    submission,
                    status="preflight_failed",
                    error_code="queue_submission_failed",
                    error_summary=str(exc),
                    event_message=f"Failed to enqueue submission: {exc}",
                )
                session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="failed to enqueue submission",
        ) from exc

    with session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is not None and submission.status == "queued" and submission.events:
            submission.events[-1].message = f"Submission queued for processing via {queue_mode}."
            session.commit()

    return SubmissionCreateResponse(
        id=submission_id,
        task_id=task_id,
        status="queued",
        status_url=f"/api/v1/submissions/{submission_id}",
    )


@router.get("/{submission_id}", response_model=SubmissionRead)
def get_submission(submission_id: str, request: Request) -> SubmissionRead:
    with request.app.state.session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission not found")
        _ = submission.events
        return _submission_to_schema(submission, request)


@router.get("/{submission_id}/logs", response_model=LogsIndexResponse)
def get_submission_logs(submission_id: str, request: Request) -> LogsIndexResponse:
    with request.app.state.session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission not found")
    return LogsIndexResponse(id=submission_id, logs=_build_log_models(submission_id, request))


@router.get("/{submission_id}/download-log/{name}")
def download_submission_log(submission_id: str, name: str, request: Request) -> FileResponse:
    if "/" in name or name.startswith("."):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="log not found")
    paths = submission_paths(request.app.state.config, submission_id)
    target = paths.logs_dir / name
    if not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="log not found")
    return FileResponse(target)
