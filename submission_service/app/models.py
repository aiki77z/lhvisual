from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from submission_service.app.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SubmissionStatus(StrEnum):
    RECEIVED = "received"
    STORED = "stored"
    QUEUED = "queued"
    PREFLIGHT_RUNNING = "preflight_running"
    PREFLIGHT_FAILED = "preflight_failed"
    REPO_PREPARE_RUNNING = "repo_prepare_running"
    REPO_PREPARE_FAILED = "repo_prepare_failed"
    ORACLE_RUNNING = "oracle_running"
    ORACLE_FAILED = "oracle_failed"
    PR_OPENING = "pr_opening"
    PR_OPEN_FAILED = "pr_open_failed"
    COMPLETED = "completed"


ACTIVE_SUBMISSION_STATUSES = {
    SubmissionStatus.RECEIVED.value,
    SubmissionStatus.STORED.value,
    SubmissionStatus.QUEUED.value,
    SubmissionStatus.PREFLIGHT_RUNNING.value,
    SubmissionStatus.REPO_PREPARE_RUNNING.value,
    SubmissionStatus.ORACLE_RUNNING.value,
    SubmissionStatus.PR_OPENING.value,
}


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(64), index=True)
    author_name: Mapped[str] = mapped_column(String(255))
    author_email: Mapped[str] = mapped_column(String(255), index=True)
    source_repo_url: Mapped[str] = mapped_column(Text)
    source_commit_sha: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    declaration_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    archive_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    archive_sha256: Mapped[str | None] = mapped_column(String(128), nullable=True)
    archive_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    artifact_root: Mapped[str | None] = mapped_column(Text, nullable=True)
    pr_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pr_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pr_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oracle_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oracle_results_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    oracle_is_resolved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    events: Mapped[list["SubmissionEvent"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="SubmissionEvent.created_at",
    )


class SubmissionEvent(Base):
    __tablename__ = "submission_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), index=True)
    status: Mapped[str] = mapped_column(String(64), index=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    submission: Mapped[Submission] = relationship(back_populates="events")
