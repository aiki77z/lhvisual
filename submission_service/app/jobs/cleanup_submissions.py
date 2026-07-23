from __future__ import annotations

import shutil
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select

from submission_service.app.config import AppConfig, load_config
from submission_service.app.db import create_engine_and_session_factory, init_db
from submission_service.app.models import Submission, SubmissionStatus, utc_now


def run_cleanup(*, config: AppConfig | None = None) -> int:
    resolved_config = config or load_config()
    engine, session_factory = create_engine_and_session_factory(resolved_config.database_url)
    init_db(engine)
    removed = 0
    completed_cutoff = utc_now() - timedelta(days=resolved_config.cleanup_completed_after_days)
    failed_cutoff = utc_now() - timedelta(days=resolved_config.cleanup_failed_after_days)
    failure_statuses = {
        SubmissionStatus.PREFLIGHT_FAILED.value,
        SubmissionStatus.REPO_PREPARE_FAILED.value,
        SubmissionStatus.ORACLE_FAILED.value,
        SubmissionStatus.PR_OPEN_FAILED.value,
    }
    with session_factory() as session:
        rows = session.scalars(select(Submission)).all()
        for row in rows:
            cutoff = completed_cutoff if row.status == SubmissionStatus.COMPLETED.value else failed_cutoff
            if row.status != SubmissionStatus.COMPLETED.value and row.status not in failure_statuses:
                continue
            if row.updated_at >= cutoff:
                continue
            if row.artifact_root:
                artifact_root = Path(row.artifact_root)
                if artifact_root.exists():
                    shutil.rmtree(artifact_root)
            session.delete(row)
            removed += 1
        session.commit()
    return removed
