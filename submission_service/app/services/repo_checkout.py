from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from submission_service.app.config import AppConfig
from submission_service.app.services.command_runner import run_command
from submission_service.app.services.harness_cli import resolve_harness_cli_path
from submission_service.app.services.storage import clean_directory


class RepoPreparationError(RuntimeError):
    def __init__(self, code: str, summary: str):
        super().__init__(summary)
        self.code = code
        self.summary = summary


@dataclass(frozen=True)
class RepoCheckoutResult:
    repo_dir: Path
    task_dir: Path


def _cli_env(repo_dir: Path) -> dict[str, str]:
    current = os.environ.get("PYTHONPATH", "")
    python_path = str(repo_dir)
    if current:
        python_path = f"{python_path}:{current}"
    return {"PYTHONPATH": python_path}


def prepare_repo_checkout(
    *,
    config: AppConfig,
    extracted_task_dir: Path,
    work_repo_dir: Path,
    task_id: str,
    log_path: Path,
) -> RepoCheckoutResult:
    clean_directory(work_repo_dir)
    clone_result = run_command(
        [
            "git",
            "clone",
            "--branch",
            config.target_base_branch,
            config.target_repo_clone_url,
            str(work_repo_dir),
        ],
        log_path=log_path,
    )
    if clone_result.returncode != 0:
        raise RepoPreparationError("repo_clone_failed", "failed to clone target repository")

    tasks_dir = work_repo_dir / "tasks"
    if not tasks_dir.exists():
        tasks_dir.mkdir(parents=True, exist_ok=True)
    target_task_dir = tasks_dir / task_id
    if target_task_dir.exists():
        raise RepoPreparationError(
            "task_already_exists",
            f"target repository already contains tasks/{task_id}",
        )
    shutil.copytree(extracted_task_dir, target_task_dir)

    try:
        cli_path = resolve_harness_cli_path(work_repo_dir)
    except FileNotFoundError as exc:
        raise RepoPreparationError("missing_harness_cli", str(exc)) from exc

    validate_result = run_command(
        [
            config.python_executable,
            str(cli_path),
            "tasks",
            "validate",
            "--task-id",
            task_id,
        ],
        cwd=work_repo_dir,
        env=_cli_env(work_repo_dir),
        log_path=log_path,
    )
    if validate_result.returncode != 0:
        raise RepoPreparationError(
            "task_validation_failed",
            f"`loopsbench tasks validate --task-id {task_id}` failed",
        )
    return RepoCheckoutResult(repo_dir=work_repo_dir, task_dir=target_task_dir)
