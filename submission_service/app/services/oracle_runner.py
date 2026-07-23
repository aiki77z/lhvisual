from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from submission_service.app.config import AppConfig
from submission_service.app.services.command_runner import run_command
from submission_service.app.services.harness_cli import resolve_harness_cli_path
from submission_service.app.services.storage import clean_directory, write_text


class OracleRunError(RuntimeError):
    def __init__(self, code: str, summary: str):
        super().__init__(summary)
        self.code = code
        self.summary = summary


@dataclass(frozen=True)
class OracleRunResult:
    run_id: str
    results_path: Path
    is_resolved: bool
    stdout_path: Path
    stderr_path: Path


def _cli_env(repo_dir: Path) -> dict[str, str]:
    current = os.environ.get("PYTHONPATH", "")
    python_path = str(repo_dir)
    if current:
        python_path = f"{python_path}:{current}"
    return {"PYTHONPATH": python_path}


def _find_results_file(output_dir: Path) -> Path:
    candidates = sorted(output_dir.rglob("results.json"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not candidates:
        raise OracleRunError("oracle_results_missing", "Oracle finished without producing results.json")
    return candidates[0]


def run_oracle(
    *,
    config: AppConfig,
    repo_dir: Path,
    task_id: str,
    output_dir: Path,
    log_path: Path,
    stdout_path: Path,
    stderr_path: Path,
) -> OracleRunResult:
    clean_directory(output_dir)
    try:
        cli_path = resolve_harness_cli_path(repo_dir)
    except FileNotFoundError as exc:
        raise OracleRunError("missing_harness_cli", str(exc)) from exc
    command = [
        config.python_executable,
        str(cli_path),
        "run",
        "--agent",
        "oracle",
        "--task-id",
        task_id,
        "--dataset-path",
        "tasks",
        "--output-path",
        str(output_dir),
        "--docker-image-strategy",
        config.oracle_docker_image_strategy,
        "--n-concurrent",
        "1",
        "--n-attempts",
        "1",
        "--no-livestream",
    ]
    if config.oracle_docker_image_namespace:
        command.extend(
            [
                "--docker-image-namespace",
                config.oracle_docker_image_namespace,
            ]
        )
    if config.oracle_docker_image_tag:
        command.extend(
            [
                "--docker-image-tag",
                config.oracle_docker_image_tag,
            ]
        )
    result = run_command(
        command,
        cwd=repo_dir,
        env=_cli_env(repo_dir),
        log_path=log_path,
    )
    write_text(stdout_path, result.stdout)
    write_text(stderr_path, result.stderr)
    if result.returncode != 0:
        raise OracleRunError("oracle_command_failed", f"Oracle command failed for {task_id}")

    results_path = _find_results_file(output_dir)
    try:
        parsed = json.loads(results_path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - defensive
        raise OracleRunError("oracle_results_invalid", f"failed to parse results.json: {exc}") from exc

    rows = parsed.get("results") or []
    matched = next((row for row in rows if row.get("task_id") == task_id), None)
    if not matched:
        raise OracleRunError("oracle_task_missing", f"results.json does not contain task {task_id}")
    if not bool(matched.get("is_resolved")):
        raise OracleRunError("oracle_not_resolved", f"Oracle did not resolve task {task_id}")

    run_id = str(parsed.get("id") or results_path.parent.name)
    return OracleRunResult(
        run_id=run_id,
        results_path=results_path,
        is_resolved=True,
        stdout_path=stdout_path,
        stderr_path=stderr_path,
    )
