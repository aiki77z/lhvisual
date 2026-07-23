from __future__ import annotations

import traceback
from pathlib import Path
from uuid import uuid4

from submission_service.app.config import AppConfig, load_config
from submission_service.app.db import create_engine_and_session_factory, init_db
from submission_service.app.models import Submission, SubmissionStatus
from submission_service.app.services.github_pr import GitHubPRService, PRCreationError
from submission_service.app.services.oracle_runner import OracleRunError, run_oracle
from submission_service.app.services.preflight import PreflightError, extract_and_validate_bundle
from submission_service.app.services.repo_checkout import RepoPreparationError, prepare_repo_checkout
from submission_service.app.services.status_events import append_event, mark_error
from submission_service.app.services.storage import relative_artifact_path, submission_paths, write_text


def _append_exception_log(path: Path, exc: BaseException) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(traceback.format_exc())
        handle.write(f"\nUnhandled error: {exc}\n")


def _process_submission_impl(submission_id: str, *, config: AppConfig) -> None:
    engine, session_factory = create_engine_and_session_factory(config.database_url)
    init_db(engine)
    paths = submission_paths(config, submission_id)
    process_log = paths.logs_dir / "process_submission.log"

    with session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is None:
            return

        try:
            append_event(
                submission,
                SubmissionStatus.PREFLIGHT_RUNNING.value,
                "Preflight checks started.",
            )
            session.commit()
            preflight_result = extract_and_validate_bundle(
                paths.upload_archive,
                archive_name=submission.archive_filename or "archive.bin",
                destination=paths.extracted_dir,
                expected_task_id=submission.task_id,
                config=config,
                log_path=paths.logs_dir / "preflight.log",
            )

            append_event(
                submission,
                SubmissionStatus.REPO_PREPARE_RUNNING.value,
                "Repository checkout and task validation started.",
            )
            session.commit()
            repo_result = prepare_repo_checkout(
                config=config,
                extracted_task_dir=preflight_result.task_dir,
                work_repo_dir=paths.repo_dir,
                task_id=submission.task_id,
                log_path=paths.logs_dir / "repo_prepare.log",
            )

            append_event(
                submission,
                SubmissionStatus.ORACLE_RUNNING.value,
                "Oracle validation started.",
            )
            session.commit()
            oracle_result = run_oracle(
                config=config,
                repo_dir=repo_result.repo_dir,
                task_id=submission.task_id,
                output_dir=paths.oracle_dir,
                log_path=paths.logs_dir / "oracle.command.log",
                stdout_path=paths.logs_dir / "oracle.stdout.log",
                stderr_path=paths.logs_dir / "oracle.stderr.log",
            )
            submission.oracle_run_id = oracle_result.run_id
            submission.oracle_results_path = relative_artifact_path(config, oracle_result.results_path)
            submission.oracle_is_resolved = oracle_result.is_resolved

            append_event(
                submission,
                SubmissionStatus.PR_OPENING.value,
                "Oracle passed; creating Draft PR.",
            )
            session.commit()
            pr_result = GitHubPRService(config).create_pull_request(
                repo_dir=repo_result.repo_dir,
                task_id=submission.task_id,
                submission_id=submission.id,
                author_name=submission.author_name,
                author_email=submission.author_email,
                source_repo_url=submission.source_repo_url,
                source_commit_sha=submission.source_commit_sha,
                oracle_run_id=oracle_result.run_id,
                oracle_results_path=submission.oracle_results_path,
                log_path=paths.logs_dir / "github_pr.log",
            )
            submission.pr_branch = pr_result.branch
            submission.pr_number = pr_result.pr_number
            submission.pr_url = pr_result.pr_url
            submission.error_code = None
            submission.error_summary = None
            final_message = (
                f"Draft PR prepared in dry-run mode at {pr_result.pr_url}."
                if pr_result.dry_run
                else f"Draft PR created successfully: {pr_result.pr_url}"
            )
            append_event(
                submission,
                SubmissionStatus.COMPLETED.value,
                final_message,
            )
            session.commit()
        except PreflightError as exc:
            mark_error(
                submission,
                status=SubmissionStatus.PREFLIGHT_FAILED.value,
                error_code=exc.code,
                error_summary=exc.summary,
                event_message=f"Preflight failed: {exc.summary}",
            )
            session.commit()
        except RepoPreparationError as exc:
            mark_error(
                submission,
                status=SubmissionStatus.REPO_PREPARE_FAILED.value,
                error_code=exc.code,
                error_summary=exc.summary,
                event_message=f"Repository preparation failed: {exc.summary}",
            )
            session.commit()
        except OracleRunError as exc:
            mark_error(
                submission,
                status=SubmissionStatus.ORACLE_FAILED.value,
                error_code=exc.code,
                error_summary=exc.summary,
                event_message=f"Oracle validation failed: {exc.summary}",
            )
            session.commit()
        except PRCreationError as exc:
            mark_error(
                submission,
                status=SubmissionStatus.PR_OPEN_FAILED.value,
                error_code=exc.code,
                error_summary=exc.summary,
                event_message=f"PR creation failed: {exc.summary}",
            )
            session.commit()
        except Exception as exc:  # pragma: no cover - defensive
            submission.error_code = "unexpected_failure"
            submission.error_summary = str(exc)
            append_event(
                submission,
                SubmissionStatus.PR_OPEN_FAILED.value,
                f"Unexpected failure: {exc}",
            )
            session.commit()
            _append_exception_log(process_log, exc)


def process_submission_job(submission_id: str) -> None:
    _process_submission_impl(submission_id, config=load_config())


def process_submission_inline(submission_id: str, *, config: AppConfig) -> None:
    _process_submission_impl(submission_id, config=config)


def enqueue_submission_job(submission_id: str, *, config: AppConfig) -> str:
    if config.process_inline:
        process_submission_inline(submission_id, config=config)
        return "inline"

    from redis import Redis
    from rq import Queue

    queue = Queue(config.queue_name, connection=Redis.from_url(config.redis_url))
    queue.enqueue(process_submission_job, submission_id, job_id=f"submission-{submission_id}-{uuid4().hex[:8]}")
    return "rq"
